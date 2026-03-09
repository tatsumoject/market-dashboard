// ================================================================
// data/config.js — All configuration for the Market Dashboard
// ================================================================

const CONFIG = {
  // Auto-refresh interval in milliseconds (default: 60 seconds)
  REFRESH_INTERVAL: 60 * 1000,

  // CORS proxy — required because Stooq does not send CORS headers.
  // corsproxy.io forwards the request and adds the CORS headers.
  // Swap this with another proxy (e.g. https://api.allorigins.win/get?url=)
  // if corsproxy.io is unreachable from your network.
  CORS_PROXY: 'https://corsproxy.io/?url=',

  // Stooq JSON endpoint — append comma-separated symbols after "s="
  // e.g. https://stooq.com/q/l/?s=^spx,^ndx&f=sd2t2ohlcv&e=json
  STOOQ_BASE: 'https://stooq.com/q/l/?f=sd2t2ohlcv&e=json&s=',

  // Frankfurter API (no CORS restriction) for forex rates
  FRANKFURTER_BASE: 'https://api.frankfurter.app',

  // ── Global Indices ─────────────────────────────────────────
  // `symbol`   : Stooq ticker (verify at stooq.com if N/D appears)
  // `currency` : native currency of the index
  // `region`   : two-letter label shown on the card
  INDICES: [
    { id: 'sp500',     name: 'S&P 500',      symbol: '^spx',     currency: 'USD', region: 'US' },
    { id: 'nasdaq',    name: 'NASDAQ 100',    symbol: '^ndx',     currency: 'USD', region: 'US' },
    { id: 'bist100',   name: 'BIST 100',      symbol: 'xu100.is', currency: 'TRY', region: 'TR' },
    { id: 'nikkei',    name: 'Nikkei 225',    symbol: '^nkx',     currency: 'JPY', region: 'JP' },
    { id: 'eurostoxx', name: 'Euro Stoxx 50', symbol: '^sx5e',    currency: 'EUR', region: 'EU' },
    { id: 'dax',       name: 'DAX',           symbol: '^dax',     currency: 'EUR', region: 'DE' },
    { id: 'ftse',      name: 'FTSE 100',      symbol: '^ftx',     currency: 'GBP', region: 'GB' },
    { id: 'moex',      name: 'MOEX',          symbol: 'imoex.me', currency: 'RUB', region: 'RU' },
  ],

  // ── Commodities ────────────────────────────────────────────
  // All commodity prices are denominated in USD on Stooq.
  // `unit` : displayed on the card (troy oz, barrel, lb …)
  COMMODITIES: [
    { id: 'gold',     name: 'Gold',      symbol: 'xauusd', currency: 'USD', unit: 'troy oz' },
    { id: 'silver',   name: 'Silver',    symbol: 'xagusd', currency: 'USD', unit: 'troy oz' },
    { id: 'brent',    name: 'Brent',     symbol: 'cb.f',   currency: 'USD', unit: 'barrel'  },
    { id: 'platinum', name: 'Platinum',  symbol: 'pl.f',   currency: 'USD', unit: 'troy oz' },
    { id: 'copper',   name: 'Copper',    symbol: 'hg.f',   currency: 'USD', unit: 'lb'      },
    { id: 'aluminum', name: 'Aluminum',  symbol: 'ali.f',  currency: 'USD', unit: 'lb'      },
  ],

  // ── Forex Pairs ────────────────────────────────────────────
  // Rates come from Frankfurter API (ECB-based, updated daily).
  // All four pairs are derived from a single USD-base API call.
  FOREX: [
    { id: 'usdtry', name: 'USD / TRY', base: 'USD', quote: 'TRY' },
    { id: 'eurtry', name: 'EUR / TRY', base: 'EUR', quote: 'TRY' },
    { id: 'eurusd', name: 'EUR / USD', base: 'EUR', quote: 'USD' },
    { id: 'gbpusd', name: 'GBP / USD', base: 'GBP', quote: 'USD' },
  ],
};
