/**
 * llm.js — advisory prompt builder + Groq call.
 *
 * The prompt is built here; the actual LLM request goes through the Express
 * server (/api/advisory) so the API key never reaches the browser.
 * If the server has no key, is down, or times out, we transparently fall
 * back to the local rule-based engine — the live demo never breaks.
 */

import { getAQILevel } from './aqiTheme';
import { describeProfile } from './personas';
import { generateFallbackAdvisory } from './ruleBasedFallback';

const API_BASE = import.meta.env.VITE_API_URL || ''; // '' -> same origin (vite proxy in dev)
const REQUEST_TIMEOUT_MS = 12000;

const SYSTEM_PROMPT = `You are AirSense, a friendly air-quality and weather health advisor.
Write a short, personalized, plain-English advisory for ONE person based on live conditions.

Format (follow exactly):
- 2 or 3 sentences of situation summary that reference the person's specific risk factors (their conditions, age group, occupation) and TODAY's numbers.
- Then exactly 3 bullet lines, each starting with "• " and a verb — concrete, doable actions (timing, masks, inhalers, ventilation, exertion level, hydration).

Rules: under 110 words total; warm, direct, zero medical jargon; no markdown headers or asterisks; never mention being an AI; at most 4 words of caution (e.g. "general guidance, not medical advice"); make the advice clearly differ between an asthma patient, an outdoor athlete, and a parent of a toddler seeing identical numbers.`;

export function buildMessages(profile, conditions) {
  const level = getAQILevel(conditions.aqi);
  const pm =
    conditions.pm25 !== null && conditions.pm25 !== undefined
      ? `, PM2.5 ${conditions.pm25} µg/m³`
      : '';
  const simNote = conditions.simulated
    ? ' NOTE: the user dragged "what-if" sliders to these HYPOTHETICAL values — treat them as real for the advisory, but open with "If conditions were like this:".'
    : '';
  const t = conditions.temperature;
  const f = conditions.feelsLike;
  const user = `LIVE CONDITIONS — ${conditions.locationName || 'unknown location'}: US AQI ${
    conditions.aqi ?? 'unknown'
  } (${level.label})${pm}, ${t ?? '?'}°C (feels like ${f ?? '?'}°C), humidity ${conditions.humidity ?? '?'}%, wind ${
    conditions.wind ?? '?'
  } km/h, sky: ${conditions.weatherLabel ?? 'unknown'}.${simNote}

PERSON — ${describeProfile(profile)}

Write their advisory now.`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: user },
  ];
}

/**
 * Returns { text, source: 'groq' | 'rules', generatedAt }.
 * Never throws — on any failure it produces the rule-based advisory.
 */
export async function getAdvisory(profile, conditions) {
  const messages = buildMessages(profile, conditions);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(`${API_BASE}/api/advisory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data.source === 'groq' && typeof data.text === 'string' && data.text.trim()) {
        return { text: data.text.trim(), source: 'groq', generatedAt: Date.now() };
      }
    }
  } catch {
    /* network error / timeout — fall through to the rules engine */
  }
  return {
    text: generateFallbackAdvisory(profile, conditions),
    source: 'rules',
    generatedAt: Date.now(),
  };
}
