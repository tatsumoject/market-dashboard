'use strict';

// ── State ─────────────────────────────────────────────────────
let lastPrices  = {};
let lastForex   = {};
let usdTry      = null;
let countdownId = null;

// ── Helpers ───────────────────────────────────────────────────
function fmt(n, dec) {
  if (n === null || !isFinite(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function pctDir(p) { return p === null ? 'neutral' : p > 0 ? 'up' : p < 0 ? 'down' : 'neutral'; }
function setTxt(id, t) { const e = document.getElementById(id); if (e) e.textContent = t; }

// ── Skeletons ─────────────────────────────────────────────────
function skeletons(gridId, n) {
  const g = document.getElementById(gridId);
  if (g) g.innerHTML = Array.from({ length: n }, () =>
    `<div class="card neutral"><div class="sk sk-label"></div><div class="sk sk-price"></div><div class="sk sk-pct"></div></div>`
  ).join('');
}

// ── Card builders ─────────────────────────────────────────────
function assetCard(asset, data) {
  const { symbol, label } = asset;
  const price = data?.price ?? null;
  const pct   = data?.pct   ?? null;
  const stale = data?.stale ?? false;
  const dir   = pctDir(pct);

  const isIndex     = 'multiplier' in asset;
  const isCommodity = CONFIG.COMMODITIES.some(c => c.symbol === symbol);

  // Price display
  let priceStr;
  if (isIndex) {
    const displayPrice = price !== null ? price * asset.multiplier : null;
    priceStr = displayPrice === null ? '—' : fmt(displayPrice, 2);
  } else if (isCommodity) {
    priceStr = price === null ? '—' : '$' + fmt(price, 2) + ' / ' + asset.unit;
  } else {
    priceStr = price === null ? '—' : '$' + fmt(price, 2);
  }

  // Percent change display
  const pctStr = pct === null ? '— %'
    : (pct >= 0 ? '▲ ' : '▼ ') + Math.abs(pct).toFixed(2) + '%';

  // TRY equivalent only on commodity cards
  let tryLine = '';
  if (isCommodity && price !== null && usdTry) {
    let tryPrice, tryUnit;
    if (symbol === 'HG') {
      tryPrice = price * usdTry * 2.20462;
      tryUnit = 'kg';
    } else {
      tryPrice = price * usdTry / 31.1035;
      tryUnit = 'gr';
    }
    tryLine = `<div class="card-sub">\u20BA${fmt(tryPrice, 2)} / ${tryUnit}</div>`;
  }

  return `<div class="card ${dir}">
    <div class="card-label">${label}${stale ? '<span class="stale-dot">●</span>' : ''}</div>
    <div class="card-price">${priceStr}</div>
    <div class="card-pct ${dir}">${pctStr}</div>
    ${tryLine}
  </div>`;
}

function forexCard(pair, data) {
  const { label } = pair;
  const rate  = data?.rate  ?? null;
  const pct   = data?.pct   ?? null;
  const stale = data?.stale ?? false;
  const dir   = pctDir(pct);
  const rateStr = rate !== null ? fmt(rate, 4) : '—';
  const pctStr  = pct === null ? '— %'
    : (pct >= 0 ? '▲ ' : '▼ ') + Math.abs(pct).toFixed(2) + '%';
  return `<div class="card ${dir}">
    <div class="card-label">${label}${stale ? '<span class="stale-dot">●</span>' : ''}</div>
    <div class="card-price">${rateStr}</div>
    <div class="card-pct ${dir}">${pctStr}</div>
  </div>`;
}

function renderAll(prices, forex) {
  const ig = document.getElementById('indices-grid');
  if (ig) ig.innerHTML = CONFIG.INDICES.map(a => assetCard(a, prices[a.symbol])).join('');
  const cg = document.getElementById('commodities-grid');
  if (cg) cg.innerHTML = CONFIG.COMMODITIES.map(a => assetCard(a, prices[a.symbol])).join('');
  const fg = document.getElementById('forex-grid');
  if (fg) fg.innerHTML = CONFIG.FOREX.map(p => forexCard(p, forex[`${p.from}/${p.to}`])).join('');
}

// ── Indices fetch (Twelve Data via proxy) ─────────────────────
async function fetchIndices() {
  const [priceRes, eodRes] = await Promise.all([
    fetch(`${CONFIG.PROXY_URL}/quote?symbols=SPY%2CQQQ`).then(r => r.json()).catch(() => ({})),
    fetch(`${CONFIG.PROXY_URL}/eod?symbols=SPY%2CQQQ`).then(r => r.json()).catch(() => ({})),
  ]);
  const out = {};
  for (const sym of ['SPY', 'QQQ']) {
    const livePrice = parseFloat(priceRes[sym]?.price);
    const eod       = parseFloat(eodRes[sym]?.close);
    // Fall back to EOD close if live quote is unavailable
    const price     = !isNaN(livePrice) ? livePrice : (!isNaN(eod) ? eod : null);
    const pct       = (!isNaN(livePrice) && !isNaN(eod) && eod !== 0)
      ? ((livePrice - eod) / eod) * 100 : null;
    out[sym] = { price, pct, stale: false };
  }
  return out;
}

// ── Commodities fetch (gold-api.com, no key) ──────────────────
async function fetchCommodities() {
  const symbols = ['XAU', 'XAG', 'XPT', 'HG'];

  // Fetch current prices + EOD closes (for % change) in parallel
  const [priceResults, eodRes] = await Promise.all([
    Promise.allSettled(
      symbols.map(s => fetch(`https://api.gold-api.com/price/${s}`, { cache: 'no-store' }).then(r => r.json()))
    ),
    fetch(`${CONFIG.PROXY_URL}/eod?symbols=XAU%2FUSD`, { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
  ]);

  // Only XAU/USD EOD is available on the free tier
  const eodMap = { XAU: parseFloat(eodRes['XAU/USD']?.close) };

  const out = {};
  priceResults.forEach((res, i) => {
    const sym = symbols[i];
    if (res.status === 'fulfilled' && res.value?.price) {
      const price    = res.value.price;
      // Use previousPrice from gold-api if available, fall back to EOD for XAU
      const prevPrice = res.value.previousPrice;
      const eodClose  = eodMap[sym] ?? NaN;
      const prev = (prevPrice && isFinite(prevPrice) && prevPrice !== 0)
        ? prevPrice
        : (!isNaN(eodClose) && eodClose !== 0) ? eodClose : null;
      const pct = prev !== null ? ((price - prev) / prev) * 100 : null;
      out[sym] = { price, pct, stale: false };
    } else {
      out[sym] = { price: null, pct: null, stale: true };
    }
  });
  return out;
}

// ── Forex fetch (Frankfurter) ─────────────────────────────────
async function fetchForex() {
  const prevDates = [1, 2, 3].map(n => {
    const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
  });
  const [latestResult, ...prevResults] = await Promise.allSettled([
    fetch('https://api.frankfurter.app/latest?from=USD&to=TRY,EUR,GBP').then(r => r.json()),
    ...prevDates.map(dt => fetch(`https://api.frankfurter.app/${dt}?from=USD&to=TRY,EUR,GBP`).then(r => r.json())),
  ]);
  if (latestResult.status !== 'fulfilled') throw new Error('Frankfurter failed');
  const r = latestResult.value.rates;
  let p = null;
  for (const res of prevResults) { if (res.status === 'fulfilled' && res.value?.rates) { p = res.value.rates; break; } }
  const chg = (cur, prv) => (prv && prv !== 0) ? ((cur - prv) / prv) * 100 : null;
  const usdTryRate = r.TRY;
  const eurTryRate = r.TRY / r.EUR;
  const eurUsdRate = 1 / r.EUR;
  const gbpUsdRate = 1 / r.GBP;
  return {
    usdTry: usdTryRate,
    pairs: {
      'USD/TRY': { rate: usdTryRate, pct: chg(usdTryRate, p?.TRY),             stale: false },
      'EUR/TRY': { rate: eurTryRate, pct: chg(eurTryRate, p ? p.TRY/p.EUR : null), stale: false },
      'EUR/USD': { rate: eurUsdRate, pct: chg(eurUsdRate, p ? 1/p.EUR : null),    stale: false },
      'GBP/USD': { rate: gbpUsdRate, pct: chg(gbpUsdRate, p ? 1/p.GBP : null),   stale: false },
    },
  };
}

// ── Countdown ─────────────────────────────────────────────────
function startCountdown(secs) {
  if (countdownId) clearInterval(countdownId);
  let remaining = secs;
  const el = document.getElementById('countdown');
  const tick = () => { if (el) el.textContent = remaining + 's'; remaining--; };
  tick();
  countdownId = setInterval(tick, 1000);
}

// ── Status ────────────────────────────────────────────────────
function setStatus(live) {
  const dot  = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (dot)  dot.className   = 'live-dot' + (live ? '' : ' stale');
  if (text) text.textContent = live ? 'Live' : 'Stale';
}

// ── Main fetch cycle ──────────────────────────────────────────
async function fetchAll(firstLoad) {
  if (firstLoad) {
    skeletons('indices-grid',    CONFIG.INDICES.length);
    skeletons('commodities-grid', CONFIG.COMMODITIES.length);
    skeletons('forex-grid',      CONFIG.FOREX.length);
  }

  let prices = lastPrices, forex = lastForex, ok = false;
  try {
    const [indicesData, commoditiesData, forexData] = await Promise.all([
      fetchIndices(), fetchCommodities(), fetchForex()
    ]);
    prices     = { ...indicesData, ...commoditiesData };
    forex      = forexData.pairs;
    usdTry     = forexData.usdTry;
    lastPrices = prices;
    lastForex  = forex;
    ok         = true;
  } catch (err) {
    console.error('[MarketWatch]', err);
    for (const k of Object.keys(lastPrices)) lastPrices[k] = { ...lastPrices[k], stale: true };
    for (const k of Object.keys(lastForex))  lastForex[k]  = { ...lastForex[k],  stale: true };
  }

  renderAll(prices, forex);
  setStatus(ok);
  setTxt('last-updated', 'Updated ' + new Date().toLocaleTimeString('en-GB', { hour12: false }));
  startCountdown(CONFIG.REFRESH_INTERVAL / 1000);
}

// ── Clock ─────────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const tick = () => { el.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false }); };
  tick();
  setInterval(tick, 1000);
}

// ── Bootstrap ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  fetchAll(true);
  setInterval(() => fetchAll(false), CONFIG.REFRESH_INTERVAL);
});
