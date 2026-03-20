const CONFIG = {
  REFRESH_INTERVAL: 300000,
  PROXY_URL: 'https://market-proxy-4jk8.onrender.com',

  INDICES: [
    { symbol: 'SPY', label: 'S&P 500',    multiplier: 10 },
    { symbol: 'QQQ', label: 'NASDAQ 100',  multiplier: 41 },
  ],

  COMMODITIES: [
    { symbol: 'XAU', label: 'Gold',     unit: 'oz' },
    { symbol: 'XAG', label: 'Silver',   unit: 'oz' },
    { symbol: 'XPT', label: 'Platinum', unit: 'oz' },
    { symbol: 'HG',  label: 'Copper',   unit: 'lb' },
  ],

  FOREX: [
    { from: 'USD', to: 'TRY', label: 'USD / TRY' },
    { from: 'EUR', to: 'TRY', label: 'EUR / TRY' },
    { from: 'EUR', to: 'USD', label: 'EUR / USD' },
    { from: 'GBP', to: 'USD', label: 'GBP / USD' },
  ],
};
