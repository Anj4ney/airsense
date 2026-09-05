'use strict';

/**
 * GET /api/health — Vercel serverless function (converted from server/index.js).
 * Same shape as the original Express route.
 */
module.exports = async function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: 'airsense-api',
    llm: process.env.GROQ_API_KEY ? 'groq' : 'rule-based-fallback',
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
    time: new Date().toISOString(),
  });
};
