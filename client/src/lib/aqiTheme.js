/**
 * aqiTheme.js — the SINGLE SOURCE OF TRUTH for AQI severity visuals.
 *
 * Every color, label, glow and gradient in the app is derived from here:
 * hero badge, alert banner, chart line & dots, map pin, share card,
 * what-if slider accents, background orbs. One mapping, used everywhere.
 *
 * Simplified 5-tier scale derived from the US EPA AQI breakpoints
 * (Good / Moderate / Unhealthy / Very Unhealthy / Hazardous).
 * The banner and caution level kick in from "Unhealthy" (AQI 101) upward —
 * sensible for an app whose core audience is sensitive groups.
 */

export const AQI_LEVELS = [
  {
    key: 'good',
    min: 0,
    max: 50,
    label: 'Good',
    color: '#22c55e',
    tagline: 'Air is clean — enjoy the outdoors',
  },
  {
    key: 'moderate',
    min: 51,
    max: 100,
    label: 'Moderate',
    color: '#e3c04b',
    tagline: 'Acceptable, but unusually sensitive people should take care',
  },
  {
    key: 'unhealthy',
    min: 101,
    max: 200,
    label: 'Unhealthy',
    color: '#f2984c',
    tagline: 'Sensitive groups should limit outdoor exertion',
  },
  {
    key: 'very-unhealthy',
    min: 201,
    max: 300,
    label: 'Very Unhealthy',
    color: '#ef4444',
    tagline: 'Health alert — everyone should reduce outdoor exposure',
  },
  {
    key: 'hazardous',
    min: 301,
    max: 500,
    label: 'Hazardous',
    color: '#b93830',
    tagline: 'Emergency conditions — stay indoors',
  },
];

export const UNKNOWN_LEVEL = {
  key: 'unknown',
  min: null,
  max: null,
  label: 'No data',
  color: '#8b93a6',
  tagline: 'AQI data unavailable right now',
};

export function getAQILevel(aqi) {
  if (aqi === null || aqi === undefined || Number.isNaN(aqi)) return UNKNOWN_LEVEL;
  return AQI_LEVELS.find((l) => aqi <= l.max) || AQI_LEVELS[AQI_LEVELS.length - 1];
}

export const aqiColor = (aqi) => getAQILevel(aqi).color;

/** rgba() helper with configurable alpha — for glows, backgrounds, borders. */
export function aqiRGBA(aqi, alpha = 0.15) {
  const c = getAQILevel(aqi).color;
  const r = parseInt(c.slice(1, 3), 16);
  const g = parseInt(c.slice(3, 5), 16);
  const b = parseInt(c.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Lighten (percent > 0) or darken (percent < 0) a hex color. */
export function shade(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const clampChannel = (v) => Math.max(0, Math.min(255, v));
  const r = clampChannel((num >> 16) + amt);
  const g = clampChannel(((num >> 8) & 0xff) + amt);
  const b = clampChannel((num & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** CSS gradient tuned to the current severity. */
export const aqiGradient = (aqi) => {
  const c = getAQILevel(aqi).color;
  return `linear-gradient(135deg, ${c} 0%, ${shade(c, -30)} 100%)`;
};

/** Segment widths of the AQI scale bar, proportional to each tier's range. */
export const AQI_SEGMENT_WIDTHS = AQI_LEVELS.map((l) => ((l.max - l.min + 1) / 501) * 100);

/** The alert banner and "heads-up" styling kick in from Unhealthy upward. */
export const isHazardousLevel = (level) =>
  level && ['unhealthy', 'very-unhealthy', 'hazardous'].includes(level.key);
