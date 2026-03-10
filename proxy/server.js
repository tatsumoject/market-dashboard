const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

app.get('/quote', async (req, res) => {
  const symbols = req.query.symbols;
  if (!symbols) return res.status(400).json({ error: 'symbols required' });
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${symbols}&formatted=false&lang=en-US&region=US`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
