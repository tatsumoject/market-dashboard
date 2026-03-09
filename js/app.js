// ================================================================
// js/app.js — Market Dashboard · Data · Rendering · Controller
// ================================================================

'use strict';

// ================================================================
// SECTION 1 — DataService
// Handles all API communication. Returns plain data objects.
// ================================================================

const DataService = {

  // Cached forex rates so TRY conversion works even while
  // a fresh forex fetch is in-flight.
  _rates: null,

  // ── Stooq (indices + commodities) ────────────────────────────
  // Fetches a batch of Stooq symbols via corsproxy.io (CORS proxy).
  // Returns an array of quote objects from Stooq's JSON response.
  async fetchStooq(symbols) {
    const symbolStr = symbols.join(',');
    const stooqUrl  = `${CONFIG.STOOQ_BASE}${symbolStr}`;
    const proxyUrl  = `${CONFIG.CORS_PROXY}${encodeURIComponent(stooqUrl)}`;

    const res = await fetch(proxyUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Stooq proxy responded ${res.status}`);

    const json = await res.json();
    // corsproxy.io returns the raw Stooq JSON directly.
    return Array.isArray(json.symbols) ? json.symbols : [];
  },

  // ── Frankfurter (forex) ──────────────────────────────────────
  // One call from USD base gives all rates needed for every pair
  // AND for converting any USD/EUR/GBP/JPY price to TRY.
  async fetchForex() {
    const url = `${CONFIG.FRANKFURTER_BASE}/latest?from=USD&to=TRY,EUR,GBP,JPY`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Frankfurter responded ${res.status}`);

    const json = await res.json();
    const r    = json.rates; // { TRY: 38.5, EUR: 0.92, GBP: 0.79, JPY: 149.0 }

    const usdTry = r.TRY;
    const rates  = {
      usdTry,
      eurTry:  usdTry / r.EUR,   // EUR → TRY  (cross-rate)
      gbpTry:  usdTry / r.GBP,   // GBP → TRY  (cross-rate)
      jpyTry:  usdTry / r.JPY,   // JPY → TRY  (cross-rate)
      eurUsd:  1 / r.EUR,         // EUR/USD
      gbpUsd:  1 / r.GBP,         // GBP/USD

      // Keyed by pair id for easy forex-card lookup
      'USD/TRY': usdTry,
      'EUR/TRY': usdTry / r.EUR,
      'EUR/USD': 1 / r.EUR,
      'GBP/USD': 1 / r.GBP,
    };

    this._rates = rates; // cache for TRY conversions
    return rates;
  },

  // ── Currency → TRY conversion ────────────────────────────────
  // Returns null if the currency has no known TRY rate (e.g. RUB).
  toTRY(price, currency) {
    if (price === null || !this._rates) return null;
    const r = this._rates;
    switch (currency) {
      case 'USD': return price * r.usdTry;
      case 'EUR': return price * r.eurTry;
      case 'GBP': return price * r.gbpTry;
      case 'JPY': return price * r.jpyTry;
      case 'TRY': return price;
      default:    return null; // RUB etc.
    }
  },

  // ── Helper: parse Stooq value ────────────────────────────────
  // Stooq returns "N/D" when markets are closed or data is absent.
  parseVal(v) {
    if (v === 'N/D' || v === null || v === undefined || v === '') return null;
    const n = parseFloat(v);
    return isFinite(n) ? n : null;
  },

  // ── Intraday change % ────────────────────────────────────────
  // (close − open) / open × 100.  Returns null when unavailable.
  pctChange(open, close) {
    if (open === null || close === null || open === 0) return null;
    return ((close - open) / open) * 100;
  },
};

// ================================================================
// SECTION 2 — Formatter
// Pure utility functions for numbers and text.
// ================================================================

const Formatter = {

  // Format with commas and a fixed decimal count.
  num(n, decimals = 2) {
    if (n === null || n === undefined || !isFinite(n)) return '--';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  },

  // Choose sensible decimal places based on magnitude.
  price(n, currency = 'USD') {
    if (n === null || !isFinite(n)) return '--';
    const prefix = currency === 'USD' ? '$' : '';
    const dec    = n >= 1000 ? 0 : n >= 10 ? 2 : 4;
    return prefix + this.num(n, dec);
  },

  // Format a % change with a directional arrow.
  change(pct) {
    if (pct === null) return '--';
    const arrow = pct >= 0 ? '▲' : '▼';
    const sign  = pct >= 0 ? '+' : '';
    return `${arrow} ${sign}${pct.toFixed(2)}%`;
  },

  // Compact TRY string: "107,810 TRY"
  try_(n) {
    if (n === null) return '--';
    return `${this.num(n, 0)} TRY`;
  },
};

// ================================================================
// SECTION 3 — Renderer
// Builds and mutates DOM. Never fetches data.
// ================================================================

const Renderer = {

  // ── Skeleton card builders ────────────────────────────────────

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

  // ── Populate card with live data ──────────────────────────────

  updateIndexCard(asset, quote) {
    const card  = this._card(asset.id);
    if (!card) return;

    const close = DataService.parseVal(quote.close);
    const open  = DataService.parseVal(quote.open);
    const pct   = DataService.pctChange(open, close);
    const tryVal = DataService.toTRY(close, asset.currency);

    const dec = (close !== null && close >= 1000) ? 0 : 2;

    card.classList.remove('loading');
    this._set(card, '.card-price',  Formatter.num(close, dec));
    this._set(card, '.card-try',    tryVal !== null ? Formatter.try_(tryVal) : (asset.currency === 'RUB' ? 'TRY n/a' : '--'));
    this._change(card, pct);
    this._accentLine(card, pct);
    this._flash(card, pct);
  },

  updateCommodityCard(asset, quote) {
    const card  = this._card(asset.id);
    if (!card) return;

    const close  = DataService.parseVal(quote.close);
    const open   = DataService.parseVal(quote.open);
    const pct    = DataService.pctChange(open, close);
    const tryVal = DataService.toTRY(close, 'USD');

    card.classList.remove('loading');
    this._set(card, '.card-price',  Formatter.price(close, 'USD'));
    this._set(card, '.card-try',    Formatter.try_(tryVal));
    this._change(card, pct);
    this._accentLine(card, pct);
    this._flash(card, pct);
  },

  updateForexCard(pair, rates) {
    const card = this._card(pair.id);
    if (!card) return;

    const key  = `${pair.base}/${pair.quote}`;
    const rate = rates ? rates[key] : null;

    // Decide decimal places: TRY pairs need 4 decimals, USD pairs 4 too
    const dec = 4;

    // For EUR/TRY and USD/TRY we optionally show the inverse
    let tryLine = '--';
    if (pair.quote === 'TRY' && rate !== null) {
      tryLine = `1 ${pair.base} = ${Formatter.num(rate, 4)} TRY`;
    } else if (pair.quote === 'USD' && rate !== null) {
      tryLine = `1 ${pair.base} = ${Formatter.num(rate, 4)} USD`;
    }

    card.classList.remove('loading');
    this._set(card, '.card-price', rate !== null ? Formatter.num(rate, dec) : 'N/A');
    this._set(card, '.card-try',   tryLine);
  },

  // ── Error state ───────────────────────────────────────────────
  markError(id, label = 'Unavailable') {
    const card = this._card(id);
    if (!card) return;
    card.classList.remove('loading');
    card.classList.add('error');
    this._set(card, '.card-price', label);
  },

  // ── Status bar ────────────────────────────────────────────────
  setStatus(state) {
    // state: 'loading' | 'live' | 'error'
    const dot  = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    if (!dot || !text) return;

    dot.className  = `status-dot ${state}`;
    text.className = `status-text ${state}`;

    const labels = { loading: 'Fetching…', live: 'Live', error: 'Error' };
    text.textContent = labels[state] || state;
  },

  setLastUpdated() {
    const el = document.getElementById('last-updated');
    if (el) el.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  },

  setCountdown(seconds) {
    const el = document.getElementById('countdown');
    if (el) el.textContent = `Next in ${seconds}s`;
  },

  // ── Private helpers ───────────────────────────────────────────

  _card(id) { return document.getElementById(`card-${id}`); },

  _set(card, selector, text) {
    const el = card.querySelector(selector);
    if (el) el.textContent = text;
  },

  _change(card, pct) {
    const el = card.querySelector('.card-change');
    if (!el) return;
    el.textContent = Formatter.change(pct);
    el.className   = `card-change ${pct === null ? 'neutral' : pct >= 0 ? 'positive' : 'negative'}`;
  },

  _accentLine(card, pct) {
    if (pct === null) return;
    card.classList.toggle('positive', pct >= 0);
    card.classList.toggle('negative', pct < 0);
  },

  _flash(card, pct) {
    if (pct === null) return;
    const cls = pct >= 0 ? 'flash-green' : 'flash-red';
    card.classList.remove('flash-green', 'flash-red');
    // Force reflow so removing + re-adding triggers animation
    void card.offsetWidth;
    card.classList.add(cls);
    card.addEventListener('animationend', () => card.classList.remove(cls), { once: true });
  },
};

// ================================================================
// SECTION 4 — Dashboard
// Main controller: bootstrap, refresh loop, countdown ticker.
// ================================================================

const Dashboard = {

  _secondsLeft: 0,
  _tickInterval: null,

  // ── Init ──────────────────────────────────────────────────────
  init() {
    this._buildSkeletons();
    this.refresh();           // first fetch immediately
    this._startCountdown();
  },

  // ── Build skeleton cards ──────────────────────────────────────
  _buildSkeletons() {
    const indicesGrid    = document.getElementById('indices-grid');
    const commoditiesGrid = document.getElementById('commodities-grid');
    const forexGrid      = document.getElementById('forex-grid');

    CONFIG.INDICES.forEach(a =>
      indicesGrid.appendChild(Renderer.buildIndexCard(a)));

    CONFIG.COMMODITIES.forEach(a =>
      commoditiesGrid.appendChild(Renderer.buildCommodityCard(a)));

    CONFIG.FOREX.forEach(p =>
      forexGrid.appendChild(Renderer.buildForexCard(p)));
  },

  // ── Main refresh ──────────────────────────────────────────────
  async refresh() {
    Renderer.setStatus('loading');

    let rates = null;

    // 1. Forex — also populates DataService._rates for TRY conversion
    try {
      rates = await DataService.fetchForex();
      CONFIG.FOREX.forEach(pair => Renderer.updateForexCard(pair, rates));
    } catch (err) {
      console.error('[Forex] fetch failed:', err);
      CONFIG.FOREX.forEach(p => Renderer.markError(p.id, 'Unavail.'));
    }

    // 2. Indices
    try {
      const symbols = CONFIG.INDICES.map(a => a.symbol);
      const quotes  = await DataService.fetchStooq(symbols);

      CONFIG.INDICES.forEach(asset => {
        const quote = quotes.find(q =>
          q.symbol && q.symbol.toLowerCase() === asset.symbol.toLowerCase());
        if (quote) {
          Renderer.updateIndexCard(asset, quote);
        } else {
          Renderer.markError(asset.id, 'N/D');
        }
      });
    } catch (err) {
      console.error('[Indices] fetch failed:', err);
      CONFIG.INDICES.forEach(a => Renderer.markError(a.id, 'Error'));
    }

    // 3. Commodities
    try {
      const symbols = CONFIG.COMMODITIES.map(a => a.symbol);
      const quotes  = await DataService.fetchStooq(symbols);

      CONFIG.COMMODITIES.forEach(asset => {
        const quote = quotes.find(q =>
          q.symbol && q.symbol.toLowerCase() === asset.symbol.toLowerCase());
        if (quote) {
          Renderer.updateCommodityCard(asset, quote);
        } else {
          Renderer.markError(asset.id, 'N/D');
        }
      });
    } catch (err) {
      console.error('[Commodities] fetch failed:', err);
      CONFIG.COMMODITIES.forEach(a => Renderer.markError(a.id, 'Error'));
    }

    // Finalise status
    Renderer.setStatus('live');
    Renderer.setLastUpdated();

    // Reset countdown
    this._secondsLeft = CONFIG.REFRESH_INTERVAL / 1000;
    Renderer.setCountdown(this._secondsLeft);
  },

  // ── Countdown ticker (1-second resolution) ────────────────────
  _startCountdown() {
    this._secondsLeft = CONFIG.REFRESH_INTERVAL / 1000;

    this._tickInterval = setInterval(() => {
      this._secondsLeft = Math.max(0, this._secondsLeft - 1);
      Renderer.setCountdown(this._secondsLeft);

      if (this._secondsLeft === 0) {
        this.refresh();
      }
    }, 1000);
  },
};

// ── Bootstrap ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => Dashboard.init());
