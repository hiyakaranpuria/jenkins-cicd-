const express = require('express');
const path = require('path');
const app = express();

app.set('trust proxy', 1);
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const urlStore = {};

function generateShortCode() {
  return Math.random().toString(36).substring(2, 8);
}

app.post('/shorten', (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format. Include http:// or https://' });
  }

  const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;

  const existing = Object.entries(urlStore).find(([, value]) => value === url);
  if (existing) {
    return res.status(200).json({
      shortUrl: `${baseUrl}/${existing[0]}`,
      shortCode: existing[0],
      originalUrl: url,
      message: 'URL already shortened'
    });
  }

  let shortCode = generateShortCode();
  while (urlStore[shortCode]) {
    shortCode = generateShortCode();
  }

  urlStore[shortCode] = url;

  return res.status(201).json({
    shortUrl: `${baseUrl}/${shortCode}`,
    shortCode,
    originalUrl: url,
    message: 'URL shortened successfully'
  });
});

app.get('/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  const originalUrl = urlStore[shortCode];

  if (!originalUrl) {
    return res.status(404).json({ error: `Short code "${shortCode}" not found` });
  }

  return res.redirect(302, originalUrl);
});

app.get('/api/all', (req, res) => {
  const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;
  const entries = Object.entries(urlStore).map(([shortCode, originalUrl]) => ({
    shortCode,
    shortUrl: `${baseUrl}/${shortCode}`,
    originalUrl
  }));

  return res.status(200).json({
    total: entries.length,
    urls: entries
  });
});

app.get('/api/health', (req, res) => {
  return res.status(200).json({
    status: 'healthy',
    uptime: `${Math.floor(process.uptime())}s`,
    totalUrls: Object.keys(urlStore).length
  });
});

app.delete('/api/delete/:shortCode', (req, res) => {
  const { shortCode } = req.params;

  if (!urlStore[shortCode]) {
    return res.status(404).json({ error: `Short code "${shortCode}" not found` });
  }

  delete urlStore[shortCode];
  return res.status(200).json({ message: `Short code "${shortCode}" deleted successfully` });
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`URL Shortener running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  }
});

module.exports = { app, server, urlStore };
