'use strict';

// ── State ─────────────────────────────────────────────────────
let lastPrices    = {};   // symbol  → { price, pct, stale }
let lastForex     = {};   // "A/B"   → { rate, pct, stale }
let usdTry        = null;
let countdownId   = null;

// ── Proxy + symbol map ────────────────────────────────────────
const ALL_ASSETS = [...CONFIG.INDICES, ...CONFIG.COMMODITIES];

const PROXY_URL   = 'https://market-proxy-4jk8.onrender.com';
const FMP_SYMBOLS = 'SPY,QQQ,XU100.IS,GCUSD,SIUSD,BZUSD,PLUSD,HGUSD,ALIUSD';

// FMP symbol → CONFIG symbol (key in lastPrices / renderAll)
const FMP_MAP = {
  'SPY':      'SPX',
  'QQQ':      'NDX',
  'XU100.IS': 'XU100',
  'GCUSD':    'XAU/USD',
  'SIUSD':    'XAG/USD',
  'BZUSD':    'BRENT',
  'PLUSD':    'XPT/USD',
  'HGUSD':    'XCU/USD',
  'ALIUSD':   'ALI/USD',
};

// ── Number formatting ─────────────────────────────────────────
function fmt(n, dec) {
  if (n === null || !isFinite(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function decimals(symbol) {
  if (['XAG/USD', 'XCU/USD', 'ALI/USD'].includes(symbol)) return 4;
  return 2;
}

function pctDir(pct) {
  if (pct === null || pct === undefined) return 'neutral';
  return pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral';
}

// ── DOM helpers ───────────────────────────────────────────────
function setEl(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function setTxt(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ── Skeleton cards ────────────────────────────────────────────
function skeletons(gridId, n) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = Array.from({ length: n }, () => `
    <div class="card neutral">
      <div class="sk sk-label"></div>
      <div class="sk sk-price"></div>
      <div class="sk sk-pct"></div>
    </div>`).join('');
}

// ── Card builders ─────────────────────────────────────────────
function assetCard(asset, data) {
  const { symbol, label, currency } = asset;
  const price = data?.price ?? null;
  const pct   = data?.pct   ?? null;
  const stale = data?.stale ?? false;

  const dir  = pctDir(pct);
  const dec  = decimals(symbol);
  const priceStr = price === null ? '—'
    : currency === 'TRY' ? '₺' + fmt(price, dec)
    : '$' + fmt(price, dec);

  const pctStr = pct === null ? '— %'
    : (pct >= 0 ? '▲ ' : '▼ ') + Math.abs(pct).toFixed(2) + '%';

  let sub = '';
  if (price !== null && usdTry) {
    if (currency === 'USD') {
      sub = `<div class="card-sub">≈ ₺${fmt(price * usdTry, 0)}</div>`;
    } else if (currency === 'TRY') {
      sub = `<div class="card-sub">≈ $${fmt(price / usdTry, 2)}</div>`;
    }
  }

  return `
    <div class="card ${dir}">
      <div class="card-label">${label}${stale ? '<span class="stale-dot" title="Stale">●</span>' : ''}</div>
      <div class="card-price">${priceStr}</div>
      <div class="card-pct ${dir}">${pctStr}</div>
      ${sub}
    </div>`;
}

function forexCard(pair, data) {
  const { label } = pair;
  const rate  = data?.rate  ?? null;
  const pct   = data?.pct   ?? null;
  const stale = data?.stale ?? false;

  const dir    = pctDir(pct);
  const rateStr = rate !== null ? fmt(rate, 4) : '—';
  const pctStr  = pct === null ? '— %'
    : (pct >= 0 ? '▲ ' : '▼ ') + Math.abs(pct).toFixed(2) + '%';

  return `
    <div class="card ${dir}">
      <div class="card-label">${label}${stale ? '<span class="stale-dot" title="Stale">●</span>' : ''}</div>
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

// ── FMP fetch via proxy ───────────────────────────────────────
async function fetchMarket() {
  const response = await fetch(
    `${PROXY_URL}/quote?symbols=${encodeURIComponent(FMP_SYMBOLS)}`
  );
  if (!response.ok) throw new Error(`Proxy error ${response.status}`);

  const results = await response.json(); // FMP returns a flat array

  const out = {};
  for (const item of results) {
    const configSym = FMP_MAP[item.symbol];
    if (!configSym) continue;
    const price = item.price              ?? null;
    const pct   = item.changesPercentage  ?? null;
    out[configSym] = { price, pct, stale: false };
  }
  return out;
}

// ── Frankfurter forex fetch ───────────────────────────────────
async function fetchForex() {
  // Try up to 3 previous calendar days to find a trading day for prev rates
  const prevDates = [1, 2, 3].map(n => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  });

  const [latestResult, ...prevResults] = await Promise.allSettled([
    fetch('https://api.frankfurter.app/latest?from=USD&to=TRY,EUR,GBP').then(r => r.json()),
    ...prevDates.map(dt =>
      fetch(`https://api.frankfurter.app/${dt}?from=USD&to=TRY,EUR,GBP`).then(r => r.json())
    ),
  ]);

  if (latestResult.status !== 'fulfilled') throw new Error('Frankfurter failed');
  const r = latestResult.value.rates;

  let p = null;
  for (const res of prevResults) {
    if (res.status === 'fulfilled' && res.value?.rates) { p = res.value.rates; break; }
  }

  const chg = (cur, prv) => (prv && prv !== 0) ? ((cur - prv) / prv) * 100 : null;

  const usdTryRate  = r.TRY;
  const eurTryRate  = r.TRY / r.EUR;
  const eurUsdRate  = 1 / r.EUR;
  const gbpUsdRate  = 1 / r.GBP;

  return {
    usdTry: usdTryRate,
    pairs: {
      'USD/TRY': { rate: usdTryRate, pct: chg(usdTryRate, p?.TRY), stale: false },
      'EUR/TRY': { rate: eurTryRate, pct: chg(eurTryRate, p ? p.TRY / p.EUR : null), stale: false },
      'EUR/USD': { rate: eurUsdRate, pct: chg(eurUsdRate, p ? 1 / p.EUR : null), stale: false },
      'GBP/USD': { rate: gbpUsdRate, pct: chg(gbpUsdRate, p ? 1 / p.GBP : null), stale: false },
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

// ── Status bar ────────────────────────────────────────────────
function setStatus(live) {
  const dot  = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (dot)  dot.className  = 'live-dot' + (live ? '' : ' stale');
  if (text) text.textContent = live ? 'Live' : 'Stale';
}

// ── Main fetch cycle ──────────────────────────────────────────
async function fetchAll(firstLoad) {
  if (firstLoad) {
    skeletons('indices-grid',    CONFIG.INDICES.length);
    skeletons('commodities-grid', CONFIG.COMMODITIES.length);
    skeletons('forex-grid',      CONFIG.FOREX.length);
  }

  let prices = lastPrices;
  let forex  = lastForex;
  let ok     = false;

  try {
    const [marketData, forexData] = await Promise.all([fetchMarket(), fetchForex()]);
    prices       = marketData;
    forex        = forexData.pairs;
    usdTry       = forexData.usdTry;
    lastPrices   = prices;
    lastForex    = forex;
    ok           = true;
  } catch (err) {
    console.error('[MarketWatch]', err);
    // Mark cached values stale
    for (const k of Object.keys(lastPrices)) lastPrices[k] = { ...lastPrices[k], stale: true };
    for (const k of Object.keys(lastForex))  lastForex[k]  = { ...lastForex[k],  stale: true };
  }

  renderAll(prices, forex);
  setStatus(ok);

  const now = new Date().toLocaleTimeString('en-GB', { hour12: false });
  setTxt('last-updated', 'Updated ' + now);
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
