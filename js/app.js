// ============================================================
//  MARKET DASHBOARD — app.js
//  Data sources:
//    • Stooq CSV (no CORS issues, free, no key)  → indices + commodities
//    • Frankfurter API (free, no key)            → forex rates
// ============================================================

const ASSETS = {
  indices: [
    { symbol: '^SPX',    label: 'S&P 500',       currency: 'USD', flag: '🇺🇸' },
    { symbol: '^NDX',    label: 'NASDAQ 100',     currency: 'USD', flag: '🇺🇸' },
    { symbol: '^NKX',    label: 'Nikkei 225',     currency: 'JPY', flag: '🇯🇵' },
    { symbol: '^STX',    label: 'Euro Stoxx 50',  currency: 'EUR', flag: '🇪🇺' },
    { symbol: '^DAX',    label: 'DAX',            currency: 'EUR', flag: '🇩🇪' },
    { symbol: '^FTM',    label: 'FTSE 100',       currency: 'GBP', flag: '🇬🇧' },
    { symbol: 'XU100.IS',label: 'BIST 100',       currency: 'TRY', flag: '🇹🇷' },
    { symbol: 'IMOEX.ME',label: 'MOEX Russia',    currency: 'RUB', flag: '🇷🇺' },
  ],
  commodities: [
    { symbol: 'XAUUSD',  label: 'Gold',           currency: 'USD', flag: '✨' },
    { symbol: 'XAGUSD',  label: 'Silver',         currency: 'USD', flag: '🪙' },
    { symbol: 'LCOUSD',  label: 'Brent Oil',      currency: 'USD', flag: '🛢️' },
    { symbol: 'XPTUSD',  label: 'Platinum',       currency: 'USD', flag: '💎' },
    { symbol: 'HGUSD',   label: 'Copper',         currency: 'USD', flag: '🟤' },
    { symbol: 'ALUUSD',  label: 'Aluminum',       currency: 'USD', flag: '⚙️' },
  ],
  forex: [
    { from: 'USD', to: 'TRY', label: 'USD / TRY' },
    { from: 'EUR', to: 'TRY', label: 'EUR / TRY' },
    { from: 'EUR', to: 'USD', label: 'EUR / USD' },
    { from: 'GBP', to: 'USD', label: 'GBP / USD' },
  ]
};

// FX rates cache (fetched once, used for TRY conversions)
let fxRates = {};
let refreshTimer = null;

// ── Clock ────────────────────────────────────────────────────
function startClock() {
  function tick() {
    const now = new Date();
    const el = document.getElementById('clock');
    if (el) el.textContent = now.toLocaleTimeString('tr-TR', { hour12: false });
  }
  tick();
  setInterval(tick, 1000);
}

// ── Format helpers ───────────────────────────────────────────
function fmt(n, decimals = 2) {
  if (n == null || isNaN(n)) return '—';
  if (Math.abs(n) >= 100000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (Math.abs(n) >= 1000)   return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (Math.abs(n) >= 10)     return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: 4 });
}

function fmtChange(pct) {
  if (pct == null || isNaN(pct)) return { text: '—', cls: 'neutral' };
  const sign = pct >= 0 ? '+' : '';
  return {
    text: `${sign}${pct.toFixed(2)}%`,
    cls: pct > 0.005 ? 'up' : pct < -0.005 ? 'down' : 'neutral'
  };
}

function currencySymbol(cur) {
  const map = { USD: '$', EUR: '€', GBP: '£', TRY: '₺', JPY: '¥', RUB: '₽' };
  return map[cur] || (cur + ' ');
}

// ── Stooq CSV fetch ──────────────────────────────────────────
// Stooq returns CSV with columns: Date,Open,High,Low,Close,Volume
// We fetch 5 days to get today + yesterday for % change
async function fetchStooq(symbol) {
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const lines = text.trim().split('\n').filter(l => l && !l.startsWith('Date'));
    if (lines.length < 1) throw new Error('No data');

    // Parse last two rows for price + change
    const parse = (line) => {
      const cols = line.split(',');
      return parseFloat(cols[4]); // Close price
    };

    const latest = parse(lines[lines.length - 1]);
    const prev   = lines.length >= 2 ? parse(lines[lines.length - 2]) : null;
    const changePct = prev ? ((latest - prev) / prev) * 100 : null;

    return { price: latest, changePct };
  } catch (e) {
    console.warn(`Stooq error for ${symbol}:`, e.message);
    return { price: null, changePct: null };
  }
}

// ── Frankfurter forex ────────────────────────────────────────
async function fetchForex() {
  try {
    // Get today's rates
    const today = await fetch('https://api.frankfurter.app/latest?from=USD&to=TRY,EUR,GBP,JPY,RUB');
    const todayData = await today.json();

    // Get yesterday's rates for % change
    const yesterday = await fetch('https://api.frankfurter.app/latest?from=USD&to=TRY,EUR,GBP,JPY,RUB&date=prev');
    const yData = await yesterday.json().catch(() => null);

    // Store USD-based rates for TRY conversion
    fxRates = { ...todayData.rates, USD: 1 };

    // Build forex pairs
    const results = {};
    const pairs = [
      { from: 'USD', to: 'TRY' },
      { from: 'EUR', to: 'TRY' },
      { from: 'EUR', to: 'USD' },
      { from: 'GBP', to: 'USD' },
    ];

    for (const pair of pairs) {
      const key = `${pair.from}/${pair.to}`;
      let price = null;
      let changePct = null;

      if (pair.from === 'USD') {
        price = todayData.rates[pair.to];
        if (yData) {
          const prev = yData.rates[pair.to];
          changePct = prev ? ((price - prev) / prev) * 100 : null;
        }
      } else {
        // Cross rate: EUR/TRY = (USD/TRY) / (USD/EUR)
        const usdTo   = todayData.rates[pair.to];
        const usdFrom = todayData.rates[pair.from];
        price = usdTo / usdFrom;
        if (yData) {
          const prevTo   = yData.rates[pair.to];
          const prevFrom = yData.rates[pair.from];
          const prevPrice = prevTo / prevFrom;
          changePct = prevPrice ? ((price - prevPrice) / prevPrice) * 100 : null;
        }
      }
      results[key] = { price, changePct };
    }

    return results;
  } catch (e) {
    console.warn('Frankfurter error:', e.message);
    return {};
  }
}

// ── TRY conversion ───────────────────────────────────────────
function toTRY(price, currency) {
  if (!price || !fxRates.TRY) return null;
  if (currency === 'TRY') return price;
  if (currency === 'USD') return price * fxRates.TRY;
  if (currency === 'EUR' && fxRates.EUR) return price * (fxRates.TRY / fxRates.EUR);
  if (currency === 'GBP' && fxRates.GBP) return price * (fxRates.TRY / fxRates.GBP);
  return null;
}

// ── Render card ──────────────────────────────────────────────
function renderCard(container, label, flag, price, changePct, currency, delay = 0) {
  const ch = fmtChange(changePct);
  const sym = currencySymbol(currency);
  const tryPrice = toTRY(price, currency);
  const tryLine = tryPrice && currency !== 'TRY'
    ? `<div class="card-try">₺ ${fmt(tryPrice, 0)}</div>`
    : '';

  const card = document.createElement('div');
  card.className = `card ${ch.cls}`;
  card.style.animationDelay = `${delay}ms`;
  card.innerHTML = `
    <div class="card-header">
      <span class="card-flag">${flag}</span>
      <span class="card-label">${label}</span>
      <span class="card-currency">${currency}</span>
    </div>
    <div class="card-price">${price != null ? sym + fmt(price) : '<span class="error-text">No data</span>'}</div>
    ${tryLine}
    <div class="card-change ${ch.cls}">${ch.text}</div>
  `;
  container.appendChild(card);
}

function renderForexCard(container, label, price, changePct, delay = 0) {
  const ch = fmtChange(changePct);
  const [from, to] = label.split(' / ');

  const card = document.createElement('div');
  card.className = `forex-card ${ch.cls}`;
  card.style.animationDelay = `${delay}ms`;
  card.innerHTML = `
    <div class="forex-pair">
      <span class="forex-from">${from}</span>
      <span class="forex-slash">/</span>
      <span class="forex-to">${to}</span>
    </div>
    <div class="forex-right">
      <div class="forex-price">${price != null ? fmt(price, 4) : '—'}</div>
      <div class="forex-change ${ch.cls}">${ch.text}</div>
    </div>
  `;
  container.appendChild(card);
}

function renderSkeleton(container, count) {
  container.innerHTML = Array(count).fill(0).map((_, i) => `
    <div class="card skeleton" style="animation-delay:${i * 60}ms">
      <div class="skel-line short"></div>
      <div class="skel-line long"></div>
      <div class="skel-line medium"></div>
    </div>
  `).join('');
}

// ── Main fetch & render ──────────────────────────────────────
async function fetchAll() {
  setStatus('loading');
  clearTimeout(refreshTimer);

  const indicesGrid     = document.getElementById('indices-grid');
  const commoditiesGrid = document.getElementById('commodities-grid');
  const forexGrid       = document.getElementById('forex-grid');

  renderSkeleton(indicesGrid, ASSETS.indices.length);
  renderSkeleton(commoditiesGrid, ASSETS.commodities.length);
  renderSkeleton(forexGrid, ASSETS.forex.length);

  let hasErrors = false;

  // ── Fetch forex first (needed for TRY conversions)
  const forexData = await fetchForex();

  // ── Fetch indices in parallel
  const indexResults = await Promise.all(
    ASSETS.indices.map(a => fetchStooq(a.symbol))
  );

  indicesGrid.innerHTML = '';
  ASSETS.indices.forEach((asset, i) => {
    const { price, changePct } = indexResults[i];
    if (price == null) hasErrors = true;
    renderCard(indicesGrid, asset.label, asset.flag, price, changePct, asset.currency, i * 60);
  });

  // ── Fetch commodities in parallel
  const commResults = await Promise.all(
    ASSETS.commodities.map(a => fetchStooq(a.symbol))
  );

  commoditiesGrid.innerHTML = '';
  ASSETS.commodities.forEach((asset, i) => {
    const { price, changePct } = commResults[i];
    if (price == null) hasErrors = true;
    renderCard(commoditiesGrid, asset.label, asset.flag, price, changePct, asset.currency, i * 60);
  });

  // ── Render forex
  forexGrid.innerHTML = '';
  ASSETS.forex.forEach((pair, i) => {
    const key = `${pair.from}/${pair.to}`;
    const data = forexData[key] || { price: null, changePct: null };
    renderForexCard(forexGrid, pair.label, data.price, data.changePct, i * 60);
  });

  // ── Update status
  const now = new Date();
  const timeStr = now.toLocaleTimeString('tr-TR', { hour12: false });
  document.getElementById('last-updated').textContent = `Updated ${timeStr}`;
  setStatus(hasErrors ? 'partial' : 'live');

  // Schedule next refresh (60 seconds)
  refreshTimer = setTimeout(fetchAll, 60000);
  updateCountdown(60);
}

// ── Countdown ────────────────────────────────────────────────
let countdownTimer = null;
function updateCountdown(seconds) {
  clearInterval(countdownTimer);
  let s = seconds;
  const el = document.getElementById('next-refresh');
  if (!el) return;
  el.textContent = `Next in ${s}s`;
  countdownTimer = setInterval(() => {
    s--;
    if (s <= 0) { clearInterval(countdownTimer); return; }
    el.textContent = `Next in ${s}s`;
  }, 1000);
}

// ── Status dot ───────────────────────────────────────────────
function setStatus(state) {
  const dot  = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (!dot || !text) return;
  dot.className = `status-dot ${state}`;
  text.textContent = state === 'loading' ? 'Loading' : state === 'partial' ? 'Partial' : 'Live';
  text.className = `status-text ${state}`;
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  fetchAll();

  const btn = document.getElementById('refresh-btn');
  if (btn) btn.addEventListener('click', () => {
    clearTimeout(refreshTimer);
    clearInterval(countdownTimer);
    fetchAll();
  });
});
