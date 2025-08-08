// Minimal local server to run the Vercel-style handler at /api
// Usage: node local-server.mjs

import express from 'express';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Dynamically import the default export (handler) from api/index.js
const { default: handler } = await import('./api/index.js');

// Proxy all routes to the handler
app.all('*', async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    console.error('Local wrapper error:', err);
    res.status(500).json({ error: 'Wrapper error', message: String(err?.message || err) });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Local API server running on http://localhost:${PORT}`);
});


