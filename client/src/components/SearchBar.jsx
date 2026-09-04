import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, MapPin, Search } from 'lucide-react';
import { searchCities } from '../lib/api';

/**
 * SearchBar — city autocomplete (Open-Meteo geocoding, no key).
 * Debounced, stale-request-safe, Enter picks the top hit.
 */
export default function SearchBar({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);
  const reqRef = useRef(0);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleChange = (value) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (!value || value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setError(null);
      setLoading(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError(null);
    debounceRef.current = setTimeout(async () => {
      const id = ++reqRef.current;
      try {
        const r = await searchCities(value.trim());
        if (reqRef.current !== id) return;
        setResults(r);
        setLoading(false);
      } catch {
        if (reqRef.current !== id) return;
        setError('City search is unreachable right now — retry in a moment.');
        setResults([]);
        setLoading(false);
      }
    }, 300);
  };

  const pick = (r) => {
    onSelect({
      name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
      lat: r.lat,
      lon: r.lon,
      source: 'search',
    });
    setQuery('');
    setResults([]);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && results.length) pick(results[0]);
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="glass rounded-xl flex items-center gap-2 px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-accent/50 transition-shadow">
        <Search className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search any city…"
          aria-label="Search for a city"
          className="bg-transparent outline-none text-sm w-full placeholder:text-muted/60 text-strong"
        />
        {loading && <Loader2 className="w-4 h-4 animate-spin text-accent shrink-0" aria-hidden="true" />}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full glass !bg-[rgba(13,17,27,0.92)] rounded-xl overflow-hidden py-1 max-h-80 overflow-y-auto border border-white/[0.1]"
          >
            {error && <p className="px-4 py-3 text-sm text-[#f2b06c]">{error}</p>}
            {!error && !loading && !results.length && (
              <p className="px-4 py-3 text-sm text-muted">No cities found — try another spelling.</p>
            )}
            {results.map((r) => (
              <button
                key={`${r.id}-${r.lat}-${r.lon}`}
                onClick={() => pick(r)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors flex items-start gap-2.5"
              >
                <MapPin className="w-4 h-4 mt-0.5 text-accent shrink-0" aria-hidden="true" />
                <span>
                  <span className="text-strong font-medium block">{r.name}</span>
                  <span className="text-muted block text-xs leading-4 mt-0.5">
                    {[r.admin1, r.country].filter(Boolean).join(', ')}
                  </span>
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
