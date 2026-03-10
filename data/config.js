const CONFIG = {
  REFRESH_INTERVAL: 300000,

  INDICES: [
    { symbol: 'SPY',     label: 'S&P 500',    currency: 'USD', note: 'via SPY ETF' },
    { symbol: 'QQQ',     label: 'NASDAQ 100', currency: 'USD', note: 'via QQQ ETF' },
  ],

  COMMODITIES: [
    { symbol: 'XAU/USD', label: 'Gold',       currency: 'USD' },
  ],

  FOREX: [
    { from: 'USD', to: 'TRY', label: 'USD / TRY' },
    { from: 'EUR', to: 'TRY', label: 'EUR / TRY' },
    { from: 'EUR', to: 'USD', label: 'EUR / USD' },
    { from: 'GBP', to: 'USD', label: 'GBP / USD' },
  ],
};
