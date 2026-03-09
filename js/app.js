// ================================================================
// js/app.js — Market Dashboard · Data · Rendering · Controller
// ================================================================

'use strict';

// ================================================================
// SECTION 1 — DataService
// Handles all API communication. Returns plain data objects.
// ================================================================

const DataService = {

  // Cached forex rates so TRY conversions work across the refresh.
  _rates: null,

  // ── Generic fetch with automatic CORS-proxy fallback ─────────
  // Tries the URL directly first. If the browser blocks it (CORS
  // TypeError) or Yahoo returns a non-2xx status, it retries
  // transparently through corsproxy.io.
  async _get(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (directErr) {
      console.warn('[DataService] Direct fetch failed, trying proxy:', directErr.message);
      const proxied = `${CONFIG.CORS_PROXY}${encodeURIComponent(url)}`;
      const res = await fetch(proxied, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
      return await res.json();
    }
  },

  // ── Yahoo Finance ─────────────────────────────────────────────
  // Fetches a batch of symbols in one call. Returns the result[]
  // array from quoteResponse. Each item contains:
  //   regularMarketPrice        — current price (number)
  //   regularMarketChangePercent — daily % change vs prev close
  //   currency                  — native currency string
  async fetchYahoo(symbols) {
    const params = new URLSearchParams({
      symbols:   symbols.join(','),
      formatted: 'false',          // raw numbers, not {raw,fmt} objects
      lang:      'en-US',
      region:    'US',
    });
    const url  = `${CONFIG.YAHOO_BASE}?${params}`;
    const data = await this._get(url);
    return data?.quoteResponse?.result ?? [];
  },

  // ── Frankfurter (forex) ──────────────────────────────────────
  // Single call from USD base. Frankfurter has native CORS support
  // so no proxy is needed. Returns a pre-computed rates object.
  async fetchForex() {
    const url  = `${CONFIG.FRANKFURTER_BASE}/latest?from=USD&to=TRY,EUR,GBP,JPY`;
    const res  = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
    const json = await res.json();
    const r    = json.rates; // { TRY, EUR, GBP, JPY } — all per 1 USD

    const usdTry = r.TRY;
    const rates  = {
      usdTry,
      eurTry: usdTry / r.EUR,  // cross-rate: 1 EUR → TRY
      gbpTry: usdTry / r.GBP,  // cross-rate: 1 GBP → TRY
      jpyTry: usdTry / r.JPY,  // cross-rate: 1 JPY → TRY

      // Keyed by "BASE/QUOTE" for forex card lookup
      'USD/TRY': usdTry,
      'EUR/TRY': usdTry / r.EUR,
      'EUR/USD': 1 / r.EUR,
      'GBP/USD': 1 / r.GBP,
    };

    this._rates = rates;
    return rates;
  },

  // ── Currency → TRY ───────────────────────────────────────────
  // Returns null for unsupported currencies (RUB, etc.).
  toTRY(price, currency) {
    if (price == null || !this._rates) return null;
    const r = this._rates;
    switch (currency) {
      case 'USD': return price * r.usdTry;
      case 'EUR': return price * r.eurTry;
      case 'GBP': return price * r.gbpTry;
      case 'JPY': return price * r.jpyTry;
      case 'TRY': return price;
      default:    return null;
    }
  },
};

// ================================================================
// SECTION 2 — Formatter
// Pure utility functions for numbers and display strings.
// ================================================================

const Formatter = {

  num(n, decimals = 2) {
    if (n == null || !isFinite(n)) return '--';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  },

  // Smart decimal count based on price magnitude.
  price(n) {
    if (n == null || !isFinite(n)) return '--';
    const dec = n >= 10000 ? 0 : n >= 1000 ? 1 : n >= 10 ? 2 : 4;
    return '$' + this.num(n, dec);
  },

  // Yahoo's regularMarketChangePercent is already in % form
  // (e.g. 0.74 means +0.74%). Arrow + sign + 2 dp.
  change(pct) {
    if (pct == null || !isFinite(pct)) return '--';
    const arrow = pct >= 0 ? '▲' : '▼';
    const sign  = pct >= 0 ? '+' : '';
    return `${arrow} ${sign}${pct.toFixed(2)}%`;
  },

  try_(n) {
    if (n == null || !isFinite(n)) return '--';
    return `${this.num(n, 0)} TRY`;
  },
};

// ================================================================
// SECTION 3 — Renderer
// Builds and mutates DOM. Never fetches data.
// ================================================================

const Renderer = {

  // ── Skeleton card builders ─────────────────────────────────

  buildIndexCard(asset) {
    const card = document.createElement('div');
    card.className = 'card loading';
    card.id = `card-${asset.id}`;
    card.innerHTML = `
      <div class="card-header">
        <span class="card-name">${asset.name}</span>
        <span class="card-badge index">${asset.currency}</span>
      </div>
      <div class="card-price"></div>
      <div class="card-try"></div>
      <div class="card-footer">
        <span class="card-change neutral"></span>
        <span class="card-region">${asset.region}</span>
      </div>`;
    return card;
  },

  buildCommodityCard(asset) {
    const card = document.createElement('div');
    card.className = 'card loading';
    card.id = `card-${asset.id}`;
    card.innerHTML = `
      <div class="card-header">
        <span class="card-name">${asset.name}</span>
        <span class="card-badge commodity">USD</span>
      </div>
      <div class="card-price"></div>
      <div class="card-try"></div>
      <div class="card-footer">
        <span class="card-change neutral"></span>
        <span class="card-unit">${asset.unit}</span>
      </div>`;
    return card;
  },

  buildForexCard(pair) {
    const card = document.createElement('div');
    card.className = 'card loading';
    card.id = `card-${pair.id}`;
    card.innerHTML = `
      <div class="card-header">
        <span class="card-name">${pair.name}</span>
        <span class="card-badge forex">FX</span>
      </div>
      <div class="card-price"></div>
      <div class="card-try"></div>
      <div class="card-footer">
        <span class="card-change neutral" style="visibility:hidden"></span>
        <span class="card-unit">${pair.base}&nbsp;base</span>
      </div>`;
    return card;
  },

  // ── Populate cards with live data ──────────────────────────

  updateIndexCard(asset, quote) {
    const card = this._card(asset.id);
    if (!card) return;

    const price  = quote.regularMarketPrice          ?? null;
    const pct    = quote.regularMarketChangePercent   ?? null;
    const tryVal = DataService.toTRY(price, asset.currency);

    // For TRY-native indices (BIST100) the card-try row shows
    // the USD equivalent instead of a TRY repeat.
    let tryText;
    if (asset.currency === 'TRY') {
      const usdVal = DataService._rates
        ? price / DataService._rates.usdTry
        : null;
      tryText = usdVal != null ? `≈ ${Formatter.price(usdVal)}` : '';
    } else if (asset.currency === 'RUB') {
      tryText = 'TRY n/a';   // Frankfurter dropped RUB post-2022
    } else {
      tryText = tryVal != null ? Formatter.try_(tryVal) : '--';
    }

    const dec = price != null && price >= 1000 ? 0 : 2;

    card.classList.remove('loading');
    this._set(card, '.card-price', Formatter.num(price, dec));
    this._set(card, '.card-try',   tryText);
    this._change(card, pct);
    this._accentLine(card, pct);
    this._flash(card, pct);
  },

  updateCommodityCard(asset, quote) {
    const card = this._card(asset.id);
    if (!card) return;

    const price  = quote.regularMarketPrice         ?? null;
    const pct    = quote.regularMarketChangePercent  ?? null;
    const tryVal = DataService.toTRY(price, 'USD');

    card.classList.remove('loading');
    this._set(card, '.card-price', Formatter.price(price));
    this._set(card, '.card-try',   Formatter.try_(tryVal));
    this._change(card, pct);
    this._accentLine(card, pct);
    this._flash(card, pct);
  },

  updateForexCard(pair, rates) {
    const card = this._card(pair.id);
    if (!card) return;

    const rate = rates?.[`${pair.base}/${pair.quote}`] ?? null;

    // Sub-line: spell out the rate in plain English
    const subLine = rate != null
      ? `1 ${pair.base} = ${Formatter.num(rate, 4)} ${pair.quote}`
      : '--';

    card.classList.remove('loading');
    this._set(card, '.card-price', rate != null ? Formatter.num(rate, 4) : 'N/A');
    this._set(card, '.card-try',   subLine);
  },

  // ── Error state ──────────────────────────────────────────────
  markError(id, label = 'N/A') {
    const card = this._card(id);
    if (!card) return;
    card.classList.remove('loading');
    card.classList.add('error');
    this._set(card, '.card-price', label);
    this._set(card, '.card-try',   '');
  },

  // ── Status bar ───────────────────────────────────────────────
  setStatus(state) {
    const dot  = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    if (!dot || !text) return;
    dot.className  = `status-dot ${state}`;
    text.className = `status-text ${state}`;
    text.textContent = { loading: 'Fetching…', live: 'Live', error: 'Error' }[state] ?? state;
  },

  setLastUpdated() {
    const el = document.getElementById('last-updated');
    if (el) el.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  },

  setCountdown(seconds) {
    const el = document.getElementById('countdown');
    if (el) el.textContent = `Next in ${seconds}s`;
  },

  // ── Private helpers ──────────────────────────────────────────

  _card(id)               { return document.getElementById(`card-${id}`); },
  _set(card, sel, text)   { const el = card.querySelector(sel); if (el) el.textContent = text; },

  _change(card, pct) {
    const el = card.querySelector('.card-change');
    if (!el) return;
    el.textContent = Formatter.change(pct);
    el.className   = `card-change ${pct == null ? 'neutral' : pct >= 0 ? 'positive' : 'negative'}`;
  },

  _accentLine(card, pct) {
    if (pct == null) return;
    card.classList.toggle('positive', pct >= 0);
    card.classList.toggle('negative', pct < 0);
  },

  _flash(card, pct) {
    if (pct == null) return;
    const cls = pct >= 0 ? 'flash-green' : 'flash-red';
    card.classList.remove('flash-green', 'flash-red');
    void card.offsetWidth; // force reflow so animation re-triggers
    card.classList.add(cls);
    card.addEventListener('animationend', () => card.classList.remove(cls), { once: true });
  },
};

// ================================================================
// SECTION 4 — Dashboard
// Main controller: bootstrap, refresh loop, countdown ticker.
// ================================================================

const Dashboard = {

  _secondsLeft:  0,
  _tickInterval: null,

  init() {
    this._buildSkeletons();
    this.refresh();
    this._startCountdown();
  },

  _buildSkeletons() {
    const ig = document.getElementById('indices-grid');
    const cg = document.getElementById('commodities-grid');
    const fg = document.getElementById('forex-grid');
    CONFIG.INDICES.forEach(a    => ig.appendChild(Renderer.buildIndexCard(a)));
    CONFIG.COMMODITIES.forEach(a => cg.appendChild(Renderer.buildCommodityCard(a)));
    CONFIG.FOREX.forEach(p      => fg.appendChild(Renderer.buildForexCard(p)));
  },

  async refresh() {
    Renderer.setStatus('loading');

    // ── 1. Forex (Frankfurter — no proxy needed) ────────────────
    // Must run first: rates are needed for TRY conversions below.
    try {
      const rates = await DataService.fetchForex();
      CONFIG.FOREX.forEach(pair => Renderer.updateForexCard(pair, rates));
    } catch (err) {
      console.error('[Forex]', err);
      CONFIG.FOREX.forEach(p => Renderer.markError(p.id, 'Unavail.'));
    }

    // ── 2. Indices + Commodities (single Yahoo Finance batch) ───
    // Combining both into one API call is more efficient and avoids
    // Yahoo's per-second rate limits.
    const allMarket  = [...CONFIG.INDICES, ...CONFIG.COMMODITIES];
    const allSymbols = allMarket.map(a => a.symbol);

    try {
      const quotes = await DataService.fetchYahoo(allSymbols);

      // Match each quote back to its config entry by symbol
      // (case-insensitive — Yahoo may normalise casing).
      const bySymbol = {};
      quotes.forEach(q => { bySymbol[q.symbol?.toUpperCase()] = q; });

      CONFIG.INDICES.forEach(asset => {
        const q = bySymbol[asset.symbol.toUpperCase()];
        if (q) Renderer.updateIndexCard(asset, q);
        else   Renderer.markError(asset.id, 'N/A');
      });

      CONFIG.COMMODITIES.forEach(asset => {
        const q = bySymbol[asset.symbol.toUpperCase()];
        if (q) Renderer.updateCommodityCard(asset, q);
        else   Renderer.markError(asset.id, 'N/A');
      });

    } catch (err) {
      console.error('[Yahoo Finance]', err);
      allMarket.forEach(a => Renderer.markError(a.id, 'Error'));
    }

    Renderer.setStatus('live');
    Renderer.setLastUpdated();
    this._secondsLeft = CONFIG.REFRESH_INTERVAL / 1000;
    Renderer.setCountdown(this._secondsLeft);
  },

  _startCountdown() {
    this._secondsLeft = CONFIG.REFRESH_INTERVAL / 1000;
    this._tickInterval = setInterval(() => {
      this._secondsLeft = Math.max(0, this._secondsLeft - 1);
      Renderer.setCountdown(this._secondsLeft);
      if (this._secondsLeft === 0) this.refresh();
    }, 1000);
  },
};

// ── Bootstrap ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => Dashboard.init());
