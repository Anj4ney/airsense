import { useEffect, useRef, useState } from 'react';
import { getAQILevel, aqiRGBA } from '../lib/aqiTheme';
import { MapSkeleton } from './SkeletonLoader';
import { cn } from '../lib/utils';

/**
 * MapView — the dramatic centerpiece: a full-height map showing India's
 * boundaries the way the Government of India requires them to be shown
 * (Jammu & Kashmir, Ladakh, Arunachal Pradesh, etc. per the official
 * Survey of India depiction) with a pulsing pin colored by the current
 * AQI severity, plus a floating translucent "tracking" info card overlaid
 * near the focal point (location / live AQI / status).
 * Clicking anywhere re-fetches weather + AQI for that exact point.
 *
 * Powered by Mappls (MapmyIndia) — India's own map provider, which is
 * why the borders are compliant. No global/free provider (Google, Esri,
 * OpenStreetMap, Carto, ...) follows India's official boundary rules,
 * so this is the trade-off for correct borders: it needs a free Mappls
 * API key. Get one at https://auth.mappls.com/console (Web SDK access,
 * free tier is generous for a personal/small project) and put it in
 * client/.env as:
 *
 *   VITE_MAPPLS_API_KEY=your_key_here
 *
 * NOTE ON THEMING: Mappls's default vector style is a single fixed look
 * (not a separate "dark" style we can request from their API in this
 * SDK version). To still respect the app's dark/light toggle, we apply
 * a CSS filter that recolors the canvas towards a dark look (see
 * `.map-canvas-dark` in index.css). It's a reasonable approximation, not
 * a true dark map style — Mappls does support custom styles via their
 * Console, so if you want a pixel-perfect dark style later, that's the path.
 */

const MAPPLS_ACCESS_TOKEN = import.meta.env.VITE_MAPPLS_API_KEY;
const MAPPLS_SDK_SRC_BASE = 'https://sdk.mappls.com/map/sdk/web?v=3.0&layer=vector';

// Module-level singleton so multiple MapView mounts (or re-renders) never
// inject the SDK <script> tag more than once.
let mapplsSdkPromise = null;
function loadMapplsSdk(accessToken) {
  if (window.mappls) return Promise.resolve(window.mappls);
  if (mapplsSdkPromise) return mapplsSdkPromise;

  mapplsSdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${MAPPLS_SDK_SRC_BASE}&access_token=${accessToken}`;
    script.async = true;
    script.onload = () => {
      // The SDK attaches itself to window.mappls once ready.
      if (window.mappls) resolve(window.mappls);
      else reject(new Error('Mappls SDK loaded but window.mappls is missing'));
    };
    script.onerror = () => reject(new Error('Failed to load the Mappls SDK script'));
    document.head.appendChild(script);
  });

  return mapplsSdkPromise;
}

/** Pulls {lat, lng} out of a Mappls map click event, defensively — the
 *  exact event shape isn't pinned down across SDK builds. */
function extractLatLng(e) {
  const src = e?.lngLat || e?.latlng || e?.lnglat || e || {};
  const lat = src.lat ?? src.latitude ?? e?.lat;
  const lng = src.lng ?? src.lon ?? src.longitude ?? e?.lng;
  return lat != null && lng != null ? { lat, lng } : null;
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

/** Shown instead of the map when no Mappls key is configured, so the app
 *  fails loudly with instructions rather than silently rendering nothing. */
function MissingKeyNotice() {
  return (
    <div className="h-[360px] sm:h-[420px] lg:h-[480px] w-full rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center justify-center gap-2 text-center px-6">
      <p className="text-sm font-semibold text-strong">Map needs a Mappls API key</p>
      <p className="text-xs text-muted max-w-xs">
        Add <code className="text-accent">VITE_MAPPLS_API_KEY</code> to <code className="text-accent">client/.env</code>.
        Get a free key at{' '}
        <a
          className="underline text-accent"
          href="https://auth.mappls.com/console"
          target="_blank"
          rel="noreferrer"
        >
          auth.mappls.com/console
        </a>
        .
      </p>
    </div>
  );
}

export default function MapView({ location, aqi, theme, onPick, loading = false }) {
  const level = getAQILevel(aqi);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapplsRef = useRef(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const [status, setStatus] = useState(MAPPLS_ACCESS_TOKEN ? 'loading' : 'missing-key');

  // Create the map once, after the SDK script has loaded.
  useEffect(() => {
    if (!MAPPLS_ACCESS_TOKEN || !location || !containerRef.current) return;
    let cancelled = false;

    loadMapplsSdk(MAPPLS_ACCESS_TOKEN)
      .then((mappls) => {
        if (cancelled || mapRef.current) return;
        mapplsRef.current = mappls;

        const map = new mappls.Map(containerRef.current, {
          center: { lat: location.lat, lng: location.lon },
          zoom: 10,
        });

        map.addListener('load', () => {
          if (cancelled) return;
          mapRef.current = map;
          setStatus('ready');
        });

        map.addListener('click', (e) => {
          const picked = extractLatLng(e);
          if (picked) onPickRef.current?.(picked.lat, picked.lng);
        });
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // Intentionally only re-run if the key/container identity changes —
    // location/theme updates below are handled without recreating the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter the existing map when the active location changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;
    map.setCenter({ lat: location.lat, lng: location.lon });
    if (map.getZoom() < 9) map.setZoom(10);
  }, [location?.lat, location?.lon]);

  // Re-draw the marker whenever position or AQI severity color changes.
  useEffect(() => {
    const map = mapRef.current;
    const mappls = mapplsRef.current;
    if (!map || !mappls || !location) return;

    if (markerRef.current) {
      mappls.remove({ map, layer: markerRef.current });
      markerRef.current = null;
    }

    markerRef.current = new mappls.Marker({
      map,
      position: { lat: location.lat, lng: location.lon },
      html: `<div class="aqi-pin" style="--pin-color:${level.color}">${aqi ?? '—'}</div>`,
      width: 46,
      height: 46,
      offset: [0, 0],
    });
  }, [status, location?.lat, location?.lon, aqi, level.color]);

  if (!location) return <MapSkeleton />;
  if (status === 'missing-key') return <MissingKeyNotice />;

  return (
    <div
      className={cn(
        'relative h-[360px] sm:h-[420px] lg:h-[480px] rounded-xl overflow-hidden z-0 border border-white/[0.07] transition-opacity',
        loading && 'opacity-70'
      )}
    >
      <div
        ref={containerRef}
        className={cn('h-full w-full', theme === 'dark' && 'map-canvas-dark')}
      />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-void/40">
          <MapSkeleton />
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-void/60 px-6 text-center">
          <p className="text-xs text-muted">
            Couldn't load the map right now. Check your connection or Mappls API key.
          </p>
        </div>
      )}

      <FloatingInfoCard location={location} aqi={aqi} level={level} />

      <p className="absolute bottom-2.5 left-2.5 z-[500] text-[10px] font-medium text-white/85 bg-void/70 backdrop-blur px-2.5 py-1.5 rounded-full pointer-events-none border border-white/10">
        Tap anywhere to check that spot's air
      </p>
    </div>
  );
}
