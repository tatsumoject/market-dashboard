// ============================================================
//  MARKETWATCH — app.js
//  Builds TradingView mini-symbol-overview widgets via JS.
//  No inline JSON in HTML = no linter false-positives.
// ============================================================

'use strict';

// ── Widget config base ────────────────────────────────────────
const WIDGET_BASE = {
  width:                   '100%',
  height:                  220,
  locale:                  'en',
  dateRange:               '1D',
  colorTheme:              'dark',
  trendLineColor:          'rgba(0, 229, 255, 1)',
  underLineColor:          'rgba(0, 229, 255, 0.1)',
  underLineBottomColor:    'rgba(0, 229, 255, 0)',
  isTransparent:           true,
  autosize:                false,
  largeChartUrl:           '',
};

// ── Create one TradingView widget card ───────────────────────
function createWidget(symbol, delay) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.animationDelay = delay + 'ms';

  const container = document.createElement('div');
  container.className = 'tradingview-widget-container';

  const inner = document.createElement('div');
  inner.className = 'tradingview-widget-container__widget';

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
  script.async = true;
  script.textContent = JSON.stringify({ ...WIDGET_BASE, symbol });

  container.appendChild(inner);
  container.appendChild(script);
  card.appendChild(container);
  return card;
}

// ── Render a list of symbols into a grid container ───────────
function renderGrid(gridId, symbols) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  symbols.forEach((symbol, i) => {
    grid.appendChild(createWidget(symbol, i * 50));
  });
}

// ── Clock ─────────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const tick = () => {
    el.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
  };
  tick();
  setInterval(tick, 1000);
}

// ── Bootstrap ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  startClock();

  renderGrid('indices-grid',    CONFIG.INDICES.map(a => a.symbol));
  renderGrid('commodities-grid', CONFIG.COMMODITIES.map(a => a.symbol));
  renderGrid('forex-grid',      CONFIG.FOREX.map(a => a.symbol));
});
