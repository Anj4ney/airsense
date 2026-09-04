import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWeather } from '../lib/api';

/**
 * useWeather — live weather for a location with a 5-minute auto-refresh.
 * Silent refreshes keep the previous data on screen (no skeleton flash)
 * while the "last updated" timestamp keeps ticking honestly.
 */

const REFRESH_INTERVAL = 5 * 60 * 1000;

export function useWeather(location) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const reqId = useRef(0);

  const lat = location?.lat;
  const lon = location?.lon;

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (lat === null || lat === undefined || lon === null || lon === undefined) return;
      const id = ++reqId.current;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const d = await fetchWeather(lat, lon);
        if (reqId.current !== id) return;
        setData(d);
        setLastUpdated(Date.now());
      } catch (e) {
        if (reqId.current !== id) return;
        setError(e.message || 'Could not load weather data');
      } finally {
        if (reqId.current === id) setLoading(false);
      }
    },
    [lat, lon]
  );

  useEffect(() => {
    if (lat === null || lat === undefined || lon === null || lon === undefined) return undefined;
    load();
    const timer = setInterval(() => load({ silent: true }), REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [load]);

  return { data, loading, error, lastUpdated, refresh: () => load() };
}
