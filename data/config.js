// ================================================================
// data/config.js — All configuration for the Market Dashboard
// ================================================================

const CONFIG = {
  // Auto-refresh interval in milliseconds (default: 60 seconds)
  REFRESH_INTERVAL: 60 * 1000,

  // CORS proxy — used as automatic fallback if Yahoo Finance
  // blocks the direct browser request (rare but possible).
  CORS_PROXY: 'https://corsproxy.io/?url=',

  // Yahoo Finance v8 quote API.
  // Accepts comma-separated symbols, returns JSON with
  // regularMarketPrice, regularMarketChangePercent, currency, etc.
  // formatted=false → raw numbers instead of {raw, fmt} objects.
  YAHOO_BASE: 'https://query1.finance.yahoo.com/v8/finance/quote',

  // Frankfurter API (ECB rates) — CORS-friendly, no key needed.
  FRANKFURTER_BASE: 'https://api.frankfurter.app',

  // ── Global Indices ─────────────────────────────────────────
  // `symbol`   : Yahoo Finance ticker
  // `currency` : native currency of the index value
  // `region`   : two-letter label shown on the card
  INDICES: [
    { id: 'sp500',     name: 'S&P 500',      symbol: '^GSPC',     currency: 'USD', region: 'US' },
    { id: 'nasdaq',    name: 'NASDAQ 100',    symbol: '^NDX',      currency: 'USD', region: 'US' },
    { id: 'bist100',   name: 'BIST 100',      symbol: 'XU100.IS',  currency: 'TRY', region: 'TR' },
    { id: 'nikkei',    name: 'Nikkei 225',    symbol: '^N225',     currency: 'JPY', region: 'JP' },
    { id: 'eurostoxx', name: 'Euro Stoxx 50', symbol: '^STOXX50E', currency: 'EUR', region: 'EU' },
    { id: 'dax',       name: 'DAX',           symbol: '^GDAXI',    currency: 'EUR', region: 'DE' },
    { id: 'ftse',      name: 'FTSE 100',      symbol: '^FTSE',     currency: 'GBP', region: 'GB' },
    { id: 'moex',      name: 'MOEX',          symbol: 'IMOEX.ME',  currency: 'RUB', region: 'RU' },
  ],

  // ── Commodities ────────────────────────────────────────────
  // Yahoo Finance futures symbols (suffix =F).
  // All denominated in USD — TRY equivalent computed from forex rate.
  COMMODITIES: [
    { id: 'gold',     name: 'Gold',      symbol: 'GC=F',  currency: 'USD', unit: 'troy oz' },
    { id: 'silver',   name: 'Silver',    symbol: 'SI=F',  currency: 'USD', unit: 'troy oz' },
    { id: 'brent',    name: 'Brent',     symbol: 'BZ=F',  currency: 'USD', unit: 'barrel'  },
    { id: 'platinum', name: 'Platinum',  symbol: 'PL=F',  currency: 'USD', unit: 'troy oz' },
    { id: 'copper',   name: 'Copper',    symbol: 'HG=F',  currency: 'USD', unit: 'lb'      },
    { id: 'aluminum', name: 'Aluminum',  symbol: 'ALI=F', currency: 'USD', unit: 'lb'      },
  ],

  // ── Forex Pairs ────────────────────────────────────────────
  // Rates sourced from Frankfurter (ECB). One USD-base call
  // is enough to derive all four pairs via cross-rate math.
  FOREX: [
    { id: 'usdtry', name: 'USD / TRY', base: 'USD', quote: 'TRY' },
    { id: 'eurtry', name: 'EUR / TRY', base: 'EUR', quote: 'TRY' },
    { id: 'eurusd', name: 'EUR / USD', base: 'EUR', quote: 'USD' },
    { id: 'gbpusd', name: 'GBP / USD', base: 'GBP', quote: 'USD' },
  ],
};
