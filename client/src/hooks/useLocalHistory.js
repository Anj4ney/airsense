import { useEffect, useMemo, useState } from 'react';
import { loadHistory, saveHistory, locationKey } from '../lib/storage';

/**
 * useLocalHistory — the 7-day AQI + temperature history layer.
 *
 * Live daily data is fetched from Open-Meteo (past_days=7, real measured
 * data — nothing invented), then merged into localStorage per location so
 * history survives reloads and multiple locations build up over time.
 * The data layer is isolated in lib/storage.js so it can become a real DB
 * later without touching any component.
 *
 * Returns { series: [{ date, day, aqi, tMax, tMin }], streak }.
 */
export function useLocalHistory(location, weather, aqi) {
  const [history, setHistory] = useState(() => loadHistory());
  const key = location ? locationKey(location.lat, location.lon) : null;

  // Merge freshly fetched daily data into the stored history (either source
  // can contribute on its own — e.g. weather quota hit but AQI still live).
  useEffect(() => {
    if (!key) return;
    const hasWeather = Boolean(weather?.daily?.length);
    const hasAqi = Boolean(aqi?.dailyAqi?.length);
    if (!hasWeather && !hasAqi) return;
    setHistory((prev) => {
      const entry = { ...(prev[key] || { days: {} }) };
      entry.days = { ...entry.days };
      if (hasWeather) {
        weather.daily.forEach((d) => {
          if (d.tMax === null || d.tMax === undefined) return;
          entry.days[d.date] = { ...(entry.days[d.date] || {}), tMax: d.tMax, tMin: d.tMin };
        });
      }
      if (hasAqi) {
        aqi.dailyAqi.forEach((d) => {
          if (d.aqi === null || d.aqi === undefined) return;
          entry.days[d.date] = { ...(entry.days[d.date] || {}), aqi: d.aqi };
        });
      }
      entry.updatedAt = Date.now();
      const next = { ...prev, [key]: entry };
      saveHistory(next);
      return next;
    });
  }, [key, weather, aqi]);

  // Chart-ready series (most recent 8 days: past 7 + today).
  const series = useMemo(() => {
    if (!key || !history[key]) return [];
    return Object.entries(history[key].days)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, v]) => ({
        date,
        aqi: v.aqi,
        tMax: v.tMax,
        tMin: v.tMin,
        day: new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
      }))
      .filter((d) => d.aqi !== undefined || d.tMax !== undefined)
      .slice(-8);
  }, [history, key]);

  const streak = useMemo(() => computeStreak(series), [series]);

  return { series, streak };
}

/**
 * Gamified streak, computed from the stored history:
 *  • "N days of Good air quality in a row"   (leaf badge)
 *  • "AQI worsening — trending up N days"    (flame badge)
 */
function computeStreak(days) {
  const withAqi = (days || []).filter((d) => d.aqi !== undefined && d.aqi !== null);
  if (!withAqi.length) return null;

  // consecutive Good days ending today
  let good = 0;
  for (let i = withAqi.length - 1; i >= 0; i--) {
    if (withAqi[i].aqi <= 50) good++;
    else break;
  }
  // consecutive day-over-day increases ending today
  let worsening = 0;
  for (let i = withAqi.length - 1; i > 0; i--) {
    if (withAqi[i].aqi > withAqi[i - 1].aqi) worsening++;
    else break;
  }

  if (good >= 2) return { type: 'good', count: good, label: `${good}-day streak of Good air quality` };
  if (good === 1) return { type: 'good', count: 1, label: 'Good air today — streak started' };
  if (worsening >= 2)
    return { type: 'worsening', count: worsening, label: `AQI worsening — trending up ${worsening} days` };
  return { type: 'steady', count: 0, label: 'Air quality steady — no streak right now' };
}
