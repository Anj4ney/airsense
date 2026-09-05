import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getAQILevel, aqiRGBA } from '../lib/aqiTheme';
import { MapSkeleton } from './SkeletonLoader';
import { cn } from '../lib/utils';

/**
 * MapView — the dramatic centerpiece: a full-height map with a pulsing pin
 * colored by the current AQI severity, plus a floating translucent
 * "tracking" info card overlaid near the focal point (location / live AQI /
 * status). Clicking anywhere re-fetches weather + AQI for that exact point.
 *
 * Powered by OpenFreeMap (https://openfreemap.org) — a free, keyless,
 * unlimited-usage vector tile host for OpenMapTiles/OpenStreetMap data,
 * rendered with MapLibre GL JS. No signup, no API key, no billing, ever.
 *
 * LABEL LANGUAGE: OpenMapTiles' default styles show "name:latin\nname:nonlatin"
 * for places whose native OSM name is in a non-Latin script (e.g. many
 * Chinese, Russian, Middle-Eastern places) — that's the two-line labels you
 * sometimes see on generic OSM maps. On `load`, we walk every symbol layer
 * in the style and force its `text-field` to just `name_en` (falling back to
 * `name` where no English translation exists in OSM data), so every label
 * renders in a single English line everywhere in the world.
 *
 * TRADE-OFF vs. Mappls: this uses OpenStreetMap's standard border rendering,
 * not the Government of India's official boundary depiction (Kashmir,
 * Arunachal Pradesh, etc. per Survey of India). That compliance-specific
 * rendering is only available from India-based providers like Mappls, which
 * require a free API key and a heavier SDK integration. This version trades
 * that for zero setup — no key, no console, no signup required at all.
 */

const ENGLISH_NAME_EXPR = ['coalesce', ['get', 'name_en'], ['get', 'name']];

const STYLE_URLS = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

const ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors © <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a>';

/** Force every label layer in the loaded style to render in English. */
function forceEnglishLabels(map) {
  const layers = map.getStyle()?.layers || [];
  for (const layer of layers) {
    if (layer.type === 'symbol' && layer.layout && layer.layout['text-field'] !== undefined) {
      try {
        map.setLayoutProperty(layer.id, 'text-field', ENGLISH_NAME_EXPR);
      } catch {
        // Some layers may not support this property at runtime — safe to skip.
      }
    }
  }
}

/** Floating translucent info card over the marker area — pure overlay,
 *  pointer-events-none so every map click still passes through. */
function FloatingInfoCard({ location, aqi, level }) {
  return (
    <div
      className="absolute top-3 right-3 z-[500] w-[196px] glass !bg-[rgba(13,17,27,0.72)] rounded-xl p-3.5 space-y-2.5 pointer-events-none border border-white/[0.1]"
      aria-hidden="true"
    >
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted">Location</p>
        <p className="text-xs font-semibold text-strong truncate leading-snug">
          {location?.name || 'Locating…'}
        </p>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted">Live AQI</p>
        <p
          className="text-2xl font-extrabold leading-none tabular-nums"
          style={{ color: aqi == null ? '#8b93a6' : level.color, textShadow: `0 0 18px ${aqiRGBA(aqi, 0.45)}` }}
        >
          {aqi ?? '—'}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted">Status</p>
        <span
          className="pill"
          style={{ color: level.color, background: aqiRGBA(aqi, 0.12), borderColor: aqiRGBA(aqi, 0.35) }}
        >
          {level.label}
        </span>
      </div>
    </div>
  );
}

export default function MapView({ location, aqi, theme, onPick, loading = false }) {
  const level = getAQILevel(aqi);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const [status, setStatus] = useState('loading');

  // Create (and recreate on theme change — different style URL) the map.
  useEffect(() => {
    if (!location || !containerRef.current) return;
    setStatus('loading');

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: theme === 'dark' ? STYLE_URLS.dark : STYLE_URLS.light,
      center: [location.lon, location.lat],
      zoom: 10,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: ATTRIBUTION }));
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    map.scrollZoom.disable();

    map.on('load', () => {
      forceEnglishLabels(map);
      setStatus('ready');
    });

    map.on('click', (e) => {
      onPickRef.current?.(e.lngLat.lat, e.lngLat.lng);
    });

    map.on('error', (e) => {
      console.error(e?.error || e);
      setStatus('error');
    });

    return () => {
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // Recreate only when the theme (style URL) changes — location/aqi updates
    // are handled below without tearing the map down.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Recenter the existing map when the active location changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location || status !== 'ready') return;
    map.easeTo({ center: [location.lon, location.lat], zoom: Math.max(map.getZoom(), 10), duration: 600 });
  }, [location?.lat, location?.lon, status]);

  // Keep the marker in sync with position and AQI severity color.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location || status !== 'ready') return;

    if (!markerRef.current) {
      const el = document.createElement('div');
      el.className = 'aqi-pin-wrap';
      markerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([location.lon, location.lat])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([location.lon, location.lat]);
    }

    markerRef.current.getElement().innerHTML = `<div class="aqi-pin" style="--pin-color:${level.color}">${aqi ?? '—'}</div>`;
  }, [status, location?.lat, location?.lon, aqi, level.color]);

  if (!location) return <MapSkeleton />;

  return (
    <div
      className={cn(
        'relative h-[360px] sm:h-[420px] lg:h-[480px] rounded-xl overflow-hidden z-0 border border-white/[0.07] transition-opacity',
        loading && 'opacity-70'
      )}
    >
      <div ref={containerRef} className="h-full w-full" />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-void/40">
          <MapSkeleton />
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-void/60 px-6 text-center">
          <p className="text-xs text-muted">Couldn't load the map right now. Check your connection.</p>
        </div>
      )}

      <FloatingInfoCard location={location} aqi={aqi} level={level} />

      <p className="absolute bottom-2.5 left-2.5 z-[500] text-[10px] font-medium text-white/85 bg-void/70 backdrop-blur px-2.5 py-1.5 rounded-full pointer-events-none border border-white/10">
        Tap anywhere to check that spot's air
      </p>
    </div>
  );
}
