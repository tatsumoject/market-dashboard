// ================================================================
// data/config.js — TradingView symbol configuration
// ================================================================

const CONFIG = {
  // ── Global Indices ─────────────────────────────────────────
  INDICES: [
    { id: 'sp500',     name: 'S&P 500',      symbol: 'SP:SPX'         },
    { id: 'nasdaq',    name: 'NASDAQ 100',    symbol: 'NASDAQ:NDX'     },
    { id: 'bist100',   name: 'BIST 100',      symbol: 'INDEX:XU100'  },
    { id: 'nikkei',    name: 'Nikkei 225',    symbol: 'TVC:NI225'      },
    { id: 'eurostoxx', name: 'Euro Stoxx 50', symbol: 'TVC:SX5E'       },
    { id: 'dax',       name: 'DAX',           symbol: 'XETR:DAX'       },
    { id: 'ftse',      name: 'FTSE 100',      symbol: 'TVC:UKX'        },
    { id: 'moex',      name: 'MOEX',          symbol: 'MOEX:IMOEX'     },
  ],

  // ── Commodities ────────────────────────────────────────────
  COMMODITIES: [
    { id: 'gold',      name: 'Gold',      symbol: 'TVC:GOLD'      },
    { id: 'silver',    name: 'Silver',    symbol: 'TVC:SILVER'    },
    { id: 'brent',     name: 'Brent Oil', symbol: 'TVC:UKOIL'     },
    { id: 'platinum',  name: 'Platinum',  symbol: 'TVC:PLATINUM'  },
    { id: 'copper',    name: 'Copper',    symbol: 'TVC:COPPER'    },
    { id: 'aluminum',  name: 'Aluminum',  symbol: 'TVC:ALUMINUM'  },
  ],

  // ── Forex Pairs ────────────────────────────────────────────
  FOREX: [
    { id: 'usdtry', name: 'USD / TRY', symbol: 'FX:USDTRY' },
    { id: 'eurtry', name: 'EUR / TRY', symbol: 'FX:EURTRY' },
    { id: 'eurusd', name: 'EUR / USD', symbol: 'FX:EURUSD' },
    { id: 'gbpusd', name: 'GBP / USD', symbol: 'FX:GBPUSD' },
  ],
};
