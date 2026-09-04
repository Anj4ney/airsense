'use strict';

/**
 * POST /api/advisory — Vercel serverless function
 * (converted from server/routes/advisory.js, same contract, no Express).
 *
 * body: { messages: [{ role: 'system'|'user'|'assistant', content: string }] }
 * Proxies to Groq; the key lives only in this function's env, never the client.
 * Failure policy unchanged: never break the demo — always resolve to
 * { source: 'groq', text, model } or { source: 'fallback', reason }.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TIMEOUT_MS = 15000;

// NOTE: serverless functions are stateless/ephemeral between invocations, so
// this in-memory limiter only approximately rate-limits (best-effort, per
// warm instance) — good enough for a demo, not a substitute for a real
// rate-limit store (e.g. Upstash/Redis) in production.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 40;
const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body || {};

  if (!validMessages(messages)) {
    return res
      .status(400)
      .json({ error: 'Invalid request — expected { messages: [{ role, content }] }' });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (isRateLimited(ip)) {
    return res.status(429).json({ source: 'fallback', reason: 'rate-limited' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      source: 'fallback',
      reason: 'no-key',
      message: 'GROQ_API_KEY is not set — using the built-in smart-rules engine.',
    });
  }

  const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 320 }),
      signal: controller.signal,
    });

    if (!groqRes.ok) {
      const detail = await groqRes.text().catch(() => '');
      console.error(`Groq error ${groqRes.status}: ${detail.slice(0, 300)}`);
      return res.status(502).json({ source: 'fallback', reason: `groq-${groqRes.status}` });
    }

    const data = await groqRes.json();
    const text =
      (data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content) ||
      '';

    if (!text.trim()) {
      return res.status(502).json({ source: 'fallback', reason: 'empty-completion' });
    }

    return res.status(200).json({ source: 'groq', text: text.trim(), model: data.model || model });
  } catch (err) {
    const reason = err && err.name === 'AbortError' ? 'groq-timeout' : 'groq-error';
    console.error(`Advisory proxy failed: ${err && err.message}`);
    return res.status(502).json({ source: 'fallback', reason });
  } finally {
    clearTimeout(timer);
  }
};
