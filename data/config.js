const CONFIG = {
  REFRESH_INTERVAL: 300000,

  INDICES: [
    { symbol: 'SPY', label: 'S&P 500',    sublabel: 'SPY ETF',          currency: 'USD' },
    { symbol: 'QQQ', label: 'NASDAQ 100', sublabel: 'QQQ ETF',          currency: 'USD' },
  ],

  COMMODITIES: [
    { symbol: 'XAU/USD', label: 'Gold', sublabel: 'XAU/USD · per oz', currency: 'USD' },
  ],

  FOREX: [
    { from: 'USD', to: 'TRY', label: 'USD / TRY' },
    { from: 'EUR', to: 'TRY', label: 'EUR / TRY' },
    { from: 'EUR', to: 'USD', label: 'EUR / USD' },
    { from: 'GBP', to: 'USD', label: 'GBP / USD' },
  ],
};
