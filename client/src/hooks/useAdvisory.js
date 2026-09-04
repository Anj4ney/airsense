import { useCallback, useEffect, useRef, useState } from 'react';
import { getAdvisory } from '../lib/llm';

/**
 * useAdvisory — generates (and re-generates) a personalized advisory.
 *
 * Inputs are watched: whenever the profile or the conditions change (persona
 * swap, location change, 5-minute refresh, what-if slider drag), a debounced
 * regeneration fires — this is what makes personalization feel live.
 *
 * Returns { advisory: { text, source, generatedAt } | null, loading, error, regenerate }.
 */
export function useAdvisory(profile, conditions, { debounce = 450 } = {}) {
  const [advisory, setAdvisory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const reqId = useRef(0);

  const generate = useCallback(async () => {
    if (!profile || !conditions) return;
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getAdvisory(profile, conditions);
      if (reqId.current !== id) return; // a newer request superseded this one
      setAdvisory({ ...result, profileName: profile.name });
    } catch (e) {
      if (reqId.current !== id) return;
      setError('Could not generate the advisory — try again.');
    } finally {
      if (reqId.current === id) setLoading(false);
    }
  }, [profile, conditions]);

  useEffect(() => {
    if (!profile || !conditions) return undefined;
    const t = setTimeout(generate, debounce);
    return () => clearTimeout(t);
  }, [generate, profile, conditions, debounce]);

  return { advisory, loading, error, regenerate: generate };
}
