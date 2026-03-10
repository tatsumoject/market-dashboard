const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

let cookieCache = null;
let crumbCache = null;

async function getYahooCrumb() {
  if (cookieCache && crumbCache) return { cookie: cookieCache, crumb: crumbCache };
  const cookieRes = await fetch('https://fc.yahoo.com', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const cookie = cookieRes.headers.get('set-cookie') || '';
  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': cookie
    }
  });
  const crumb = await crumbRes.text();
  cookieCache = cookie;
  crumbCache = crumb;
  return { cookie, crumb };
}

app.get('/quote', async (req, res) => {
  const symbols = req.query.symbols;
  if (!symbols) return res.status(400).json({ error: 'symbols required' });
  try {
    const { cookie, crumb } = await getYahooCrumb();
    const url = `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${symbols}&crumb=${encodeURIComponent(crumb)}&formatted=false&lang=en-US&region=US`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookie
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    cookieCache = null; crumbCache = null;
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
