/**
 * ruleBasedFallback.js — the zero-key advisory engine.
 *
 * When no GROQ_API_KEY is configured (or the LLM call fails), this local
 * generator produces a genuinely personalized advisory by combining:
 *   • AQI severity tier          (situation + protection actions)
 *   • the person's risk factors  (asthma / heart / pregnancy / age / …)
 *   • their day-to-day exposure  (outdoor worker / athlete / indoor)
 *   • live weather overlay       (heat, cold, wind, stagnant air)
 *
 * The output format matches the LLM format exactly (short paragraphs +
 * "• " bullets), so AdvisoryCard / TTS / share-card treat both sources
 * identically.
 */

import { getAQILevel } from './aqiTheme';
import { personaPhrase, isSensitiveProfile } from './personas';

const fmtTemp = (t) => (t === null || t === undefined || Number.isNaN(t) ? '—' : `${Math.round(t)}°C`);
const fmtWind = (w) => (w === null || w === undefined || Number.isNaN(w) ? '—' : `${Math.round(w)} km/h`);

function openingLine(conditions, level, profile) {
  const { aqi, locationName, temperature, weatherLabel, simulated } = conditions;
  const city = locationName || 'your area';
  const sky = weatherLabel ? `, ${weatherLabel.toLowerCase()} at ${fmtTemp(temperature)}` : '';
  const prefix = simulated ? 'If conditions were like this — ' : '';
  const who = personaPhrase(profile);
  const sensitive = isSensitiveProfile(profile);

  switch (level.key) {
    case 'good':
      return `${prefix}Air quality in ${city} is Good (AQI ${aqi ?? '—'})${sky} — this is the clean end of the scale, safe for everyone including ${who}.`;
    case 'moderate':
      return sensitive
        ? `${prefix}Air quality in ${city} is Moderate (AQI ${aqi})${sky} — acceptable for most people, but borderline for ${who}, so it is worth playing it smart today.`
        : `${prefix}Air quality in ${city} is Moderate (AQI ${aqi})${sky} — fine for the general public; unusually sensitive people should just watch how they feel.`;
    case 'unhealthy':
      return sensitive
        ? `${prefix}Air quality in ${city} has crossed into Unhealthy territory (AQI ${aqi})${sky} — as ${who}, today is a day to actively change your plans, not just "be careful".`
        : `${prefix}Air quality in ${city} is Unhealthy (AQI ${aqi})${sky} — everyone may begin to feel effects, and heavy outdoor breathing will notice it first.`;
    case 'very-unhealthy':
      return `${prefix}Air quality in ${city} is Very Unhealthy (AQI ${aqi})${sky} — a health alert for everyone, not only sensitive groups. Treat outdoor time as exposure to avoid.`;
    case 'hazardous':
      return `${prefix}Air quality in ${city} is Hazardous (AQI ${aqi})${sky} — emergency conditions. Everyone, including ${who}, should stay indoors with filtration running.`;
    default:
      return `${prefix}Air quality data for ${city} is unavailable right now${sky} — here is guidance based on weather alone until the AQI reading returns.`;
  }
}

function riskLine(profile, conditions) {
  const conds = profile.conditions || [];
  const lines = [];
  if (conds.includes('asthma')) {
    lines.push(
      `Fine particles at this level are a known asthma trigger — any chest tightness or dry cough means head indoors and use your reliever.`
    );
  }
  if (conds.includes('heart')) {
    lines.push(
      `Particle pollution strains the heart within hours of exposure, so skip any intense outdoor effort today.`
    );
  }
  if (conds.includes('pregnancy')) {
    lines.push(
      `You are breathing for two — cleaner air matters more now, and afternoon hours are usually the worst.`
    );
  }
  if (conds.includes('respiratory')) {
    lines.push(`Your airways are already sensitive, so this air will affect you before it affects others.`);
  }
  if (profile.ageGroup === 'toddler' || profile.ageGroup === 'child') {
    lines.push(
      `Little lungs take in far more air per kilogram of body weight than adult lungs, so the same AQI hits a small child noticeably harder.`
    );
  }
  if (profile.ageGroup === 'senior') {
    lines.push(
      `With age, the heart and lungs cope less with particle pollution and heat — pacing yourself today is the smart move.`
    );
  }
  if (!lines.length) {
    if (profile.occupation === 'athlete') {
      lines.push(
        `Hard breathing means you inhale many times more pollution per minute than at rest — train smart today.`
      );
    } else if (profile.occupation === 'outdoor') {
      lines.push(
        `Your workday happens outdoors, so shielding yourself matters more for you than for desk workers.`
      );
    } else if (conditions.temperature !== null && conditions.temperature !== undefined) {
      lines.push(`With no chronic conditions, your plan today is mostly about comfort and timing.`);
    }
  }
  return lines[0] || '';
}

function levelActions(conditions, profile) {
  const sensitive = isSensitiveProfile(profile);
  const conds = profile.conditions || [];
  const { aqi } = conditions;

  switch (getAQILevel(aqi).key) {
    case 'good':
      return [
        'Get outside — a walk, a run, or throwing the windows open is ideal right now.',
        'No mask or filtration needed; bank your outdoor activity on days like this.',
        `Air this clean helps lungs recover — a good day for a longer session than usual.`,
      ];
    case 'moderate':
      return [
        sensitive
          ? 'Keep outdoor effort in the easy zone — walking is fine, hard intervals are not.'
          : 'Usual outdoor activity is fine; just notice how your chest feels as the day warms up.',
        conds.includes('asthma')
          ? 'Carry your reliever inhaler even for short trips outside today.'
          : 'Move longer outdoor plans earlier in the day if you can — pollution builds toward evening.',
        sensitive
          ? 'Watch for the first sign of irritation (cough, tight chest, watery eyes) and step indoors.'
          : 'No special protection needed for most healthy adults at this level.',
      ];
    case 'unhealthy':
      return [
        sensitive
          ? 'Stay indoors where possible — if you must go out, a well-fitted N95 mask genuinely helps.'
          : 'Trim outdoor time to what is necessary and keep the effort light.',
        profile.occupation === 'athlete'
          ? 'Cut intensity by about half or move the session indoors — same fitness, far less irritation.'
          : profile.occupation === 'outdoor'
            ? 'Take an indoor break every hour and mask up when AQI climbs past 150.'
            : 'Close windows during the afternoon peak and let a purifier or AC run on recirculate.',
        conds.includes('asthma')
          ? 'Keep your reliever inhaler within reach all day and pre-warm up indoors.'
          : profile.ageGroup === 'toddler' || profile.ageGroup === 'child'
            ? 'Keep outdoor play short and low-energy, and watch for a nighttime cough.'
            : 'Shift anything sweaty to indoors — gyms, stairs, or an at-home circuit all count.',
      ];
    case 'very-unhealthy':
      return [
        'Everyone should stay indoors with windows closed and air set to recirculate.',
        'Run a HEPA purifier in the room where you spend the most hours — usually the bedroom.',
        'Reschedule anything outdoor; this level harms healthy lungs too, not just sensitive ones.',
      ];
    case 'hazardous':
      return [
        'Treat the outdoor air as an emergency: stay inside with filtration running continuously.',
        'Seal gaps around windows and doors, and create one clean-air room rather than diluting the whole home.',
        'If breathing feels off (tight chest, dizziness), seek care early — do not wait for it to worsen.',
      ];
    default:
      return [
        'Check the map or trend view again shortly — AQI readings usually return within minutes.',
        'Default to the cautious side until the number comes back.',
        'Keep windows closed if the sky looks hazy or smoky.',
      ];
  }
}

function weatherOverlay(conditions, profile) {
  const { temperature, wind, humidity } = conditions;
  const out = [];

  if (temperature !== null && temperature !== undefined) {
    const t = temperature;
    const heatVulnerable =
      profile.ageGroup === 'senior' || profile.ageGroup === 'toddler' || profile.ageGroup === 'child';
    if (t >= 36) {
      out.push(
        heatVulnerable
          ? `At ${fmtTemp(t)} this is dangerous heat — stay hydrated, cool, and indoors during midday.`
          : `At ${fmtTemp(t)} hydrate before you feel thirsty and shade yourself between noon and 4 pm.`
      );
    } else if (t >= 32) {
      out.push(
        `${fmtTemp(t)} plus pollution is a sweaty combination — drink water steadily through the day.`
      );
    } else if (t <= 2) {
      out.push(
        `Near-freezing air is dry and can tighten airways — breathe through a scarf when outside.`
      );
    }
  }

  if (wind !== null && wind !== undefined) {
    if (wind >= 25) out.push(`The ${fmtWind(wind)} wind is helping scatter pollutants a little today.`);
    else if (wind <= 5) out.push(`Almost still air — pollution is building near ground level instead of clearing.`);
  }

  if (humidity !== null && humidity !== undefined && humidity >= 80 && temperature >= 30) {
    out.push(`High humidity makes the air feel heavier — expect to tire faster outdoors.`);
  }

  return out;
}

/** Build the final advisory text (same shape the LLM is asked to produce). */
export function generateFallbackAdvisory(profile, conditions) {
  if (!conditions) return '';
  const level = getAQILevel(conditions.aqi);

  const paragraphs = [openingLine(conditions, level, profile)];
  const risk = riskLine(profile, conditions);
  if (risk) paragraphs.push(risk);

  // Action selection: 2 tier-specific actions + 1 weather-aware action when
  // available — mirrors how a clinician prioritizes ("protect first").
  const tier = levelActions(conditions, profile);
  const weather = weatherOverlay(conditions, profile);
  const actions = [tier[0], tier[1], weather[0] || tier[2] || weather[1] || tier[3]].filter(Boolean);

  return [...paragraphs, '', ...actions.map((a) => `• ${a}`)].join('\n');
}

export default generateFallbackAdvisory;
