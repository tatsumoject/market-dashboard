// ============================================================
//  MARKETWATCH — app.js
//  Builds TradingView symbol-overview widgets via JS.
// ============================================================

'use strict';

// ── Widget config base ────────────────────────────────────────
const WIDGET_BASE = {
  chartOnly:           false,
  width:               '100%',
  height:              220,
  locale:              'en',
  colorTheme:          'dark',
  autosize:            false,
  showVolume:          false,
  showMA:              false,
  hideDateRanges:      false,
  hideMarketStatus:    false,
  hideSymbolLogo:      false,
  scalePosition:       'right',
  scaleMode:           'Normal',
  fontFamily:          'Azeret Mono',
  fontSize:            '10',
  noTimeScale:         false,
  valuesTracking:      '1',
  changeMode:          'price-and-percent',
  trendLineColor:      'rgba(0, 229, 255, 1)',
  underLineColor:      'rgba(0, 229, 255, 0.1)',
  underLineBottomColor:'rgba(0, 229, 255, 0)',
  isTransparent:       true,
};

const WIDGET_URL = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';

// ── Create one TradingView widget card ───────────────────────
function createWidget(name, symbol, delay) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.animationDelay = delay + 'ms';

  const container = document.createElement('div');
  container.className = 'tradingview-widget-container';

  const inner = document.createElement('div');
  inner.className = 'tradingview-widget-container__widget';

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = WIDGET_URL;
  script.async = true;
  script.textContent = JSON.stringify({
    ...WIDGET_BASE,
    symbols: [[name, symbol]],
  });

  container.appendChild(inner);
  container.appendChild(script);
  card.appendChild(container);
  return card;
}

// ── Render a list of assets into a grid container ────────────
function renderGrid(gridId, assets) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  assets.forEach(({ name, symbol }, i) => {
    grid.appendChild(createWidget(name, symbol, i * 50));
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

  renderGrid('indices-grid',     CONFIG.INDICES);
  renderGrid('commodities-grid', CONFIG.COMMODITIES);
  renderGrid('forex-grid',       CONFIG.FOREX);
});
