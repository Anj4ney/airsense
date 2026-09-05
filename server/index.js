'use strict';

/**
 * AirSense API — lightweight Express server.
 *
 * Its only real job is to proxy the Groq LLM call so the API key stays
 * server-side. Weather + AQI data is fetched directly from Open-Meteo by
 * the browser (no key required), so this service stays tiny.
 *
 * If no GROQ_API_KEY is configured, /api/advisory answers with a
 * "fallback" marker and the client generates a smart rule-based advisory —
 * the demo always works, live.
 */

require('dotenv').config();

const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const cors = require('cors');

const advisoryRoutes = require('./routes/advisory');

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '200kb' }));

// Small request log — keeps the hackathon demo debuggable.
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api')) {
      console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - t0}ms)`);
    }
  });
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'airsense-api',
    llm: process.env.GROQ_API_KEY ? 'groq' : 'rule-based-fallback',
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
    time: new Date().toISOString(),
  });
});

app.use('/api/advisory', advisoryRoutes);

// ── Optional: serve a built client (single-service deployments) ────────────
// Deploy only this service (Render/Railway) with the client built into
// client/dist, and the whole app runs from a single origin.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log('Serving built client from client/dist');
}

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  const mode = process.env.GROQ_API_KEY
    ? 'Groq LLM enabled'
    : 'no GROQ_API_KEY set — advisories use the client smart-rules fallback';
  console.log(`AirSense API listening on http://localhost:${PORT} (${mode})`);
});
