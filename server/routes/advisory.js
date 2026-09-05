'use strict';

/**
 * POST /api/advisory
 *   body: { messages: [{ role: 'system'|'user'|'assistant', content: string }] }
 *
 * Proxies advisory generation to Groq (https://console.groq.com — free tier,
 * no credit card). The key lives only here, on the server.
 *
 * Failure policy: NEVER break the demo. If the key is missing, rate-limited,
 * or Groq errors out, we return a "fallback" marker (HTTP 200/502) and the
 * client generates a rule-based advisory locally instead.
 */

const express = require('express');

const router = express.Router();

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TIMEOUT_MS = 15000;

// Tiny in-memory rate limiter — protects a free-tier key during public demos.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 40;
const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // never let the map grow unbounded
  if (recent.length >= MAX_REQUESTS) return true;
  recent.push(now);
  return false;
}

function validMessages(messages) {
  return (
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.length <= 12 &&
    messages.every(
      (m) =>
        m &&
        typeof m === 'object' &&
        ['system', 'user', 'assistant'].includes(m.role) &&
        typeof m.content === 'string' &&
        m.content.length > 0 &&
        m.content.length <= 6000
    )
  );
}

router.post('/', async (req, res) => {
  const { messages } = req.body || {};

  if (!validMessages(messages)) {
    return res
      .status(400)
      .json({ error: 'Invalid request — expected { messages: [{ role, content }] }' });
  }

  const ip = req.ip || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ source: 'fallback', reason: 'rate-limited' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.json({
      source: 'fallback',
      reason: 'no-key',
      message: 'GROQ_API_KEY is not set — using the built-in smart-rules engine.',
    });
  }

  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.6,
        max_tokens: 320,
      }),
      signal: controller.signal,
    });

    if (!groqRes.ok) {
      const detail = await groqRes.text().catch(() => '');
      console.error(`Groq error ${groqRes.status}: ${detail.slice(0, 300)}`);
      return res.status(502).json({ source: 'fallback', reason: `groq-${groqRes.status}` });
    }

    const data = await groqRes.json();
    const text =
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();

    if (!text) {
      return res.status(502).json({ source: 'fallback', reason: 'empty-completion' });
    }

    return res.json({ source: 'groq', text, model: data.model || model });
  } catch (err) {
    const reason = err && err.name === 'AbortError' ? 'groq-timeout' : 'groq-error';
    console.error(`Advisory proxy failed: ${err && err.message}`);
    return res.status(502).json({ source: 'fallback', reason });
  } finally {
    clearTimeout(timer);
  }
});

module.exports = router;
