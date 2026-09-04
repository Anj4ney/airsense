/**
 * storage.js — the localStorage data layer.
 *
 * Deliberately isolated so that swapping to a real database / API later
 * means changing ONLY this file — components and hooks keep calling the
 * same loadX/saveX functions.
 *
 * Keys:
 *   airsense.profile.v1   — the user's saved health profile
 *   airsense.location.v1  — last viewed location (instant reload)
 *   airsense.history.v1   — 7-day AQI/temperature history per location
 *   airsense.theme        — 'dark' | 'light'
 */

const KEYS = {
  profile: 'airsense.profile.v1',
  history: 'airsense.history.v1',
  location: 'airsense.location.v1',
  theme: 'airsense.theme',
};

const MAX_LOCATIONS = 10;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — degrade silently */
  }
}

// ── health profile ───────────────────────────────────────────────────────────
export const loadProfile = () => read(KEYS.profile, null);
export const saveProfile = (profile) => write(KEYS.profile, profile);

// ── last location ────────────────────────────────────────────────────────────
export const loadLocation = () => read(KEYS.location, null);
export const saveLocation = (location) => write(KEYS.location, location);

// ── 7-day history ────────────────────────────────────────────────────────────
// Shape: { [locationKey]: { days: { 'YYYY-MM-DD': { aqi, tMax, tMin } }, updatedAt } }
export const loadHistory = () => read(KEYS.history, {});

export function saveHistory(history) {
  // Prune to the N most recently updated locations so storage stays tiny.
  const entries = Object.entries(history).sort(
    (a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0)
  );
  write(KEYS.history, Object.fromEntries(entries.slice(0, MAX_LOCATIONS)));
}

// ── theme ────────────────────────────────────────────────────────────────────
export function loadTheme() {
  try {
    return localStorage.getItem(KEYS.theme) || 'dark';
  } catch {
    return 'dark';
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(KEYS.theme, theme);
  } catch {
    /* noop */
  }
}

/** Stable cache key for a lat/lon (2 decimals ≈ ~1 km). */
export const locationKey = (lat, lon) => `${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;
