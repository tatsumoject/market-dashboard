'use strict';

// ── State ─────────────────────────────────────────────────────
let lastPrices    = {};   // symbol  → { price, pct, stale }
let lastForex     = {};   // "A/B"   → { rate, pct, stale }
let usdTry        = null;
let countdownId   = null;

// ── Symbol list for batch API calls ───────────────────────────
const ALL_ASSETS  = [...CONFIG.INDICES, ...CONFIG.COMMODITIES];
const SYMBOL_LIST = ALL_ASSETS.map(a => a.symbol).join(',');

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

// ── Twelve Data fetch ─────────────────────────────────────────
async function fetchMarket() {
  const key  = CONFIG.TWELVEDATA_API_KEY;
  const base = 'https://api.twelvedata.com';
  const syms = SYMBOL_LIST;

  const [priceRes, eodRes] = await Promise.all([
    fetch(`${base}/price?symbol=${syms}&apikey=${key}`),
    fetch(`${base}/eod?symbol=${syms}&apikey=${key}`),
  ]);

  if (!priceRes.ok || !eodRes.ok) throw new Error('Twelve Data error');

  const [priceJson, eodJson] = await Promise.all([priceRes.json(), eodRes.json()]);

  const out = {};
  for (const asset of ALL_ASSETS) {
    const s = asset.symbol;
    // Batch response: keyed by symbol. Single-symbol response is flat.
    const pd = ALL_ASSETS.length === 1 ? priceJson : priceJson[s];
    const ed = ALL_ASSETS.length === 1 ? eodJson   : eodJson[s];

    const price = pd?.price && pd.status !== 'error' ? parseFloat(pd.price) : null;
    const prev  = ed?.close && ed.status !== 'error' ? parseFloat(ed.close) : null;
    const pct   = price !== null && prev !== null && prev !== 0
      ? ((price - prev) / prev) * 100 : null;

    out[s] = { price: isFinite(price) ? price : null, pct, stale: false };
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
