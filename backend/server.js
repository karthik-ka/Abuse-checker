const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const REMOVED_KEYWORDS = [
  'not found',
  '404',
  'access denied',
  'forbidden',
  'no such file',
  'page not found',
  'content removed',
  'suspended',
  'account suspended',
  'this site has been removed',
  'this page has been removed',
  'phishing reported',
  'deceptive site',
];

const REMOVED_STATUS_CODES = [403, 404, 410, 451];

app.post('/api/check-url', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const url = req.body && req.body.url;
  if (!url || typeof url !== 'string') {
    return res.json({ statusCode: null, removed: true, reason: 'invalid-request' });
  }

  // Basic URL validation
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.json({ statusCode: null, removed: true, reason: 'invalid-protocol' });
    }
  } catch {
    return res.json({ statusCode: null, removed: true, reason: 'invalid-url' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
      }
    });

    clearTimeout(timeout);

    // Read at most 64KB of body for keyword matching
    const rawText = await response.text();
    const body = rawText.slice(0, 65536).toLowerCase();

    const removedByStatus = REMOVED_STATUS_CODES.includes(response.status);
    const removedByKeyword = REMOVED_KEYWORDS.some(k => body.includes(k));
    const removed = removedByStatus || removedByKeyword;

    return res.json({
      statusCode: response.status,
      removed,
      reason: removed
        ? (removedByStatus ? `http-${response.status}` : 'keyword-match')
        : 'reachable',
      finalUrl: response.url !== url ? response.url : undefined,
    });

  } catch (err) {
    const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
    return res.json({
      statusCode: null,
      removed: true,
      reason: isTimeout ? 'timeout' : 'fetch-failed',
      error: err.message,
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[abuse-console] Backend running on port ${PORT}`);
});
