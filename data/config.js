const CONFIG = {
  TWELVEDATA_API_KEY: '3325e24cffbf4bda9c1495dbdad49337E',
  REFRESH_INTERVAL: 210000,

  INDICES: [
    { symbol: 'SPX',   label: 'S&P 500',    currency: 'USD' },
    { symbol: 'NDX',   label: 'NASDAQ 100', currency: 'USD' },
    { symbol: 'XU100', label: 'BIST 100',   currency: 'TRY' },
  ],

  COMMODITIES: [
    { symbol: 'XAU/USD', label: 'Gold',      currency: 'USD' },
    { symbol: 'XAG/USD', label: 'Silver',    currency: 'USD' },
    { symbol: 'BRENT',   label: 'Brent Oil', currency: 'USD' },
    { symbol: 'XPT/USD', label: 'Platinum',  currency: 'USD' },
    { symbol: 'XCU/USD', label: 'Copper',    currency: 'USD' },
    { symbol: 'ALI/USD', label: 'Aluminum',  currency: 'USD' },
  ],

  FOREX: [
    { from: 'USD', to: 'TRY', label: 'USD / TRY' },
    { from: 'EUR', to: 'TRY', label: 'EUR / TRY' },
    { from: 'EUR', to: 'USD', label: 'EUR / USD' },
    { from: 'GBP', to: 'USD', label: 'GBP / USD' },
  ],
};
