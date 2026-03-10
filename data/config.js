const CONFIG = {
  REFRESH_INTERVAL: 300000,
  PROXY_URL: 'https://market-proxy-4jk8.onrender.com',

  INDICES: [
    { symbol: 'SPY', label: 'S&P 500',    sublabel: 'SPY ETF · USD', currency: 'USD' },
    { symbol: 'QQQ', label: 'NASDAQ 100', sublabel: 'QQQ ETF · USD', currency: 'USD' },
  ],

  COMMODITIES: [
    { symbol: 'XAU', label: 'Gold',     sublabel: 'per oz · USD', currency: 'USD' },
    { symbol: 'XAG', label: 'Silver',   sublabel: 'per oz · USD', currency: 'USD' },
    { symbol: 'XPT', label: 'Platinum', sublabel: 'per oz · USD', currency: 'USD' },
    { symbol: 'HG',  label: 'Copper',   sublabel: 'per lb · USD', currency: 'USD' },
  ],

  FOREX: [
    { from: 'USD', to: 'TRY', label: 'USD / TRY' },
    { from: 'EUR', to: 'TRY', label: 'EUR / TRY' },
    { from: 'EUR', to: 'USD', label: 'EUR / USD' },
    { from: 'GBP', to: 'USD', label: 'GBP / USD' },
  ],
};
