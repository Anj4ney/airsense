import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getAQILevel, aqiRGBA } from '../lib/aqiTheme';
import { MapSkeleton } from './SkeletonLoader';
import { cn } from '../lib/utils';

/**
 * MapView — the dramatic centerpiece: a full-height dark Leaflet map
 * (OpenStreetMap tiles, no API key required) with a pulsing pin colored by
 * the current AQI severity, plus a floating translucent "tracking" info
 * card overlaid near the focal point (location / live AQI / status),
 * mirroring the reference dashboard's tooltip.
 * Clicking anywhere re-fetches weather + AQI for that exact point.
 */

const CARTO_LIGHT = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const CARTO_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const CARTO_SUBDOMAINS = 'abcd';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Keep the view centered on the active location as it changes. */
function Recenter({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], map.getZoom() < 9 ? 10 : map.getZoom(), { animate: true });
  }, [lat, lon, map]);
  return null;
}

/** Click anywhere -> weather + AQI for that point. */
function ClickCatcher({ onPick }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  });
  return null;
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

  const pinIcon = useMemo(
    () =>
      L.divIcon({
        className: 'airsense-pin-wrap',
        html: `<div class="aqi-pin" style="--pin-color:${level.color}">${aqi ?? '—'}</div>`,
        iconSize: [46, 46],
        iconAnchor: [23, 23],
      }),
    [aqi, level.color]
  );

  if (!location) return <MapSkeleton />;

  return (
    <div
      className={cn(
        'relative h-[360px] sm:h-[420px] lg:h-[480px] rounded-xl overflow-hidden z-0 border border-white/[0.07] transition-opacity',
        loading && 'opacity-70'
      )}
    >
      <MapContainer
        center={[location.lat, location.lon]}
        zoom={10}
        scrollWheelZoom={false}
        className="h-full w-full"
        attributionControl
      >
        {/* key={theme} forces a clean remount when switching basemaps */}
        <TileLayer
          key={`carto-${theme}`}
          url={theme === 'dark' ? CARTO_DARK : CARTO_LIGHT}
          attribution={ATTRIBUTION}
          subdomains={CARTO_SUBDOMAINS}
          maxZoom={20}
        />
        <Recenter lat={location.lat} lon={location.lon} />
        <ClickCatcher onPick={onPick} />
        <Marker position={[location.lat, location.lon]} icon={pinIcon} keyboard={false} />
      </MapContainer>

      <FloatingInfoCard location={location} aqi={aqi} level={level} />

      <p className="absolute bottom-2.5 left-2.5 z-[500] text-[10px] font-medium text-white/85 bg-void/70 backdrop-blur px-2.5 py-1.5 rounded-full pointer-events-none border border-white/10">
        Tap anywhere to check that spot's air
      </p>
    </div>
  );
}
