/**
 * api.js — every external data fetcher.
 *
 * All sources are free and key-less (no signup friction, no hardcoded data):
 *   • Weather        — Open-Meteo Forecast API
 *   • Air quality    — Open-Meteo Air Quality API (US AQI scale)
 *   • City search    — Open-Meteo Geocoding API
 *   • Reverse geocode— BigDataCloud client endpoint (free, no key)
 *
 * They are called straight from the browser — no backend round-trip needed.
 */

const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast';
const AQI_BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEOCODE_BASE = 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_GEOCODE_BASE = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

async function fetchJson(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return await res.json();
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error('Request timed out — check your connection');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Live weather + the last 7 days of daily history for the trend chart.
 * Returns { fetchedAt, current: {...}, daily: [{ date, tMax, tMin, code }] }
 */
export async function fetchWeather(lat, lon) {
  const url =
    `${WEATHER_BASE}?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
    '&past_days=7&forecast_days=1&timezone=auto';
  const j = await fetchJson(url);
  const c = j.current || {};
  return {
    fetchedAt: Date.now(),
    current: {
      temperature: c.temperature_2m,
      humidity: c.relative_humidity_2m,
      feelsLike: c.apparent_temperature,
      isDay: c.is_day === 1 || c.is_day === true,
      precipitation: c.precipitation ?? 0,
      weatherCode: c.weather_code ?? 0,
      windSpeed: c.wind_speed_10m,
      windDirection: c.wind_direction_10m,
    },
    daily: (j.daily?.time || []).map((date, i) => ({
      date,
      tMax: j.daily.temperature_2m_max?.[i],
      tMin: j.daily.temperature_2m_min?.[i],
      code: j.daily.weather_code?.[i],
    })),
  };
}

/**
 * Live US AQI + pollutants + the last 7 days of hourly AQI (aggregated per
 * day on the client). Returns { fetchedAt, current: {...}, dailyAqi }.
 */
export async function fetchAQI(lat, lon) {
  const url =
    `${AQI_BASE}?latitude=${lat}&longitude=${lon}` +
    '&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide' +
    '&hourly=us_aqi&past_days=7&forecast_days=1&timezone=auto';
  const j = await fetchJson(url);
  const c = j.current || {};
  return {
    fetchedAt: Date.now(),
    current: {
      usAqi: c.us_aqi,
      pm25: c.pm2_5,
      pm10: c.pm10,
      ozone: c.ozone,
      no2: c.nitrogen_dioxide,
      so2: c.sulphur_dioxide,
      co: c.carbon_monoxide,
    },
    dailyAqi: aggregateDailyAqi(j.hourly?.time, j.hourly?.us_aqi),
  };
}

/** Mean US AQI per local calendar day from an hourly series. */
export function aggregateDailyAqi(times, values) {
  if (!Array.isArray(times) || !Array.isArray(values)) return [];
  const buckets = new Map();
  times.forEach((t, i) => {
    const v = values[i];
    if (v === null || v === undefined) return;
    const date = t.slice(0, 10);
    if (!buckets.has(date)) buckets.set(date, []);
    buckets.get(date).push(v);
  });
  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, arr]) => ({
      date,
      aqi: Math.round(arr.reduce((s, v) => s + v, 0) / arr.length),
    }));
}

/** City autocomplete (Open-Meteo geocoding). */
export async function searchCities(query) {
  const url = `${GEOCODE_BASE}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
  const j = await fetchJson(url, 8000);
  return (j.results || []).map((r) => ({
    id: r.id,
    name: r.name,
    admin1: r.admin1 || '',
    country: r.country || '',
    lat: r.latitude,
    lon: r.longitude,
  }));
}

/** Human-readable place name for a lat/lon (best effort, never throws). */
export async function reverseGeocode(lat, lon) {
  try {
    const url = `${REVERSE_GEOCODE_BASE}?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const j = await fetchJson(url, 8000);
    return {
      name: j.city || j.locality || 'Your location',
      region: j.principalSubdivision || '',
      country: j.countryName || '',
    };
  } catch {
    return { name: 'Your location', region: '', country: '' };
  }
}
