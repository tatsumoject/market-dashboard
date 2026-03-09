// ============================================================
//  MARKETWATCH — app.js
//  Clock only — all market data served by TradingView widgets
// ============================================================

'use strict';

function startClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const tick = () => {
    el.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
  };
  tick();
  setInterval(tick, 1000);
}

document.addEventListener('DOMContentLoaded', startClock);
