import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAQI } from '../lib/api';

/**
 * useAQI — live US AQI + pollutants for a location, auto-refreshing every
 * 5 minutes (same contract as useWeather).
 */

const REFRESH_INTERVAL = 5 * 60 * 1000;

export function useAQI(location) {
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
        const d = await fetchAQI(lat, lon);
        if (reqId.current !== id) return;
        setData(d);
        setLastUpdated(Date.now());
      } catch (e) {
        if (reqId.current !== id) return;
        setError(e.message || 'Could not load air quality data');
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
