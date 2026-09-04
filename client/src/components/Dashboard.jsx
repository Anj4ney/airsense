import { useEffect, useReducer, useRef, useState } from 'react';
import { animate, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  CloudOff,
  Droplets,
  MapPin,
  RotateCw,
  Thermometer,
  Wind as WindIcon,
} from 'lucide-react';
import { AQI_LEVELS, AQI_SEGMENT_WIDTHS, aqiColor, aqiRGBA, getAQILevel } from '../lib/aqiTheme';
import { getWeatherMeta, windDirectionLabel } from '../lib/weatherCodes';
import { useAdvisory } from '../hooks/useAdvisory';
import AdvisoryCard from './AdvisoryCard';
import MapView from './MapView';
import TrendChart from './TrendChart';
import StreakBadge from './StreakBadge';
import WhatIfSimulator from './WhatIfSimulator';
import PersonaQuickSelect from './PersonaQuickSelect';
import { AqiHeroSkeleton, ChartSkeleton, MapSkeleton, MetricSkeleton } from './SkeletonLoader';
import ErrorState from './ErrorState';
import { cn } from '../lib/utils';

/**
 * Dashboard — the main view, "Planet.ai" mission-control layout.
 * Left rail: icon-tile stat cards (temp / humidity / wind / sky) + 7-day
 * history timeline. Center: the map hero + 7-day trend chart. Right rail:
 * AQI status card (progress bar) + personalized advisory + what-if simulator.
 * All data bindings, handlers and hooks are unchanged — restyle only.
 */

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

/** Animated number count-up for the AQI hero. */
function CountUp({ value }) {
  const [display, setDisplay] = useState(value ?? 0);
  const prevRef = useRef(value ?? 0);
  useEffect(() => {
    if (value === null || value === undefined) return undefined;
    const controls = animate(prevRef.current, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    });
    prevRef.current = value;
    return () => controls.stop();
  }, [value]);
  return <>{value === null || value === undefined ? '—' : Math.round(display)}</>;
}

/** "updated 12s ago" — ticks every second, subtle. */
function LastUpdated({ timestamp }) {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    const id = setInterval(force, 1000);
    return () => clearInterval(id);
  }, []);
  if (!timestamp) return null;
  const secs = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  const label = secs < 5 ? 'just now' : secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)}m ago`;
  return (
    <span className="text-[11px] text-muted flex items-center gap-1.5">
      <Clock className="w-3 h-3" aria-hidden="true" />
      updated {label}
    </span>
  );
}

/** Small colored delta chip with an arrow (green = improving, red = worsening). */
function DeltaBadge({ delta, unit = '', goodWhenNegative = false, neutral = false }) {
  if (delta === null || delta === undefined || Number.isNaN(delta) || delta === 0) return null;
  const improving = goodWhenNegative ? delta < 0 : delta > 0;
  const tone = neutral
    ? 'bg-white/[0.05] border-white/10 text-muted'
    : improving
      ? 'bg-up/10 border-up/25 text-up'
      : 'bg-down/10 border-down/25 text-down';
  const Down = delta < 0;
  return (
    <span className={cn('pill shrink-0', tone)} title={`${delta > 0 ? '+' : ''}${delta}${unit} vs yesterday`}>
      {Down ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
      {Math.abs(Math.round(delta * 10) / 10)}
      {unit}
    </span>
  );
}

/** Row of thin vertical bar segments, lit to the filled proportion —
 *  the reference's "Average delivery time" indicator pattern. */
function SegmentBars({ value, max, segments = 14, color = '#6c8cff', className }) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const lit = Math.round(Math.max(0, Math.min(1, value / max)) * segments);
  return (
    <div className={cn('flex items-end gap-[3px]', className)} aria-hidden="true">
      {Array.from({ length: segments }).map((_, i) => (
        <span
          key={i}
          className="w-1 rounded-full transition-all duration-500"
          style={{
            height: i < lit ? '15px' : '7px',
            background: i < lit ? color : 'rgba(255, 255, 255, 0.10)',
            boxShadow: i < lit ? `0 0 8px ${color}55` : undefined,
          }}
        />
      ))}
    </div>
  );
}

/** Proportional AQI scale bar with a marker at the current value. */
function AqiScaleBar({ aqi }) {
  const pct = aqi == null ? null : Math.min(100, (aqi / 500) * 100);
  return (
    <div aria-hidden="true">
      <div className="relative h-1.5 rounded-full overflow-hidden flex bg-white/[0.06]">
        {AQI_LEVELS.map((l, i) => (
          <span key={l.key} style={{ width: `${AQI_SEGMENT_WIDTHS[i]}%`, background: l.color, opacity: 0.4 }} />
        ))}
        {pct !== null && (
          <span
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-[2.5px] border-void shadow-lg transition-all duration-500"
            style={{ left: `calc(${pct}% - 7px)`, background: aqiColor(aqi) }}
          />
        )}
      </div>
      <div className="flex mt-1.5 hidden sm:flex">
        {AQI_LEVELS.map((l, i) => (
          <span key={l.key} className="text-[9px] text-muted truncate" style={{ width: `${AQI_SEGMENT_WIDTHS[i]}%` }}>
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function PollutantChip({ label, value, unit = 'µg/m³' }) {
  if (value === null || value === undefined) return null;
  return (
    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-muted">
      {label} <span className="text-strong font-semibold">{Math.round(value * 10) / 10}</span> {unit}
    </span>
  );
}

/** AQI status card — the right rail's "progress/status summary" card. */
function AqiHero({ aqi, location, aqiData, lastUpdated, delta }) {
  const level = getAQILevel(aqi);
  const current = aqiData?.current;
  return (
    <div
      className="glass rounded-2xl p-5 sm:p-6 relative overflow-hidden"
      style={{ boxShadow: `0 24px 60px -28px ${aqiRGBA(aqi, 0.45)}` }}
    >
      <div
        className="absolute -right-16 -top-20 w-64 h-64 rounded-full blur-3xl pointer-events-none animate-drift"
        style={{ background: aqiRGBA(aqi, 0.14) }}
      />
      <div className="relative flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Air quality</span>
        <div className="flex items-center gap-2">
          <DeltaBadge delta={delta} goodWhenNegative />
          <span
            className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border"
            style={{ color: level.color, borderColor: aqiRGBA(aqi, 0.4), background: aqiRGBA(aqi, 0.1) }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: level.color }} />
            {level.label}
          </span>
        </div>
      </div>

      <div className="relative mt-3 flex items-end gap-3 flex-wrap">
        <span
          className="text-6xl font-extrabold tracking-tighter leading-none tabular-nums"
          style={{ color: level.color, textShadow: `0 0 44px ${aqiRGBA(aqi, 0.5)}` }}
        >
          <CountUp value={aqi} />
        </span>
        <span className="pb-1.5">
          <span className="block text-[10px] text-muted font-bold uppercase tracking-[0.2em]">US AQI</span>
          <span className="flex items-center gap-1.5 text-sm font-medium text-strong">
            <MapPin className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
            <span className="truncate max-w-[150px] sm:max-w-[220px]">{location?.name || 'Locating…'}</span>
          </span>
        </span>
        <span className="ml-auto pb-1">
          <LastUpdated timestamp={lastUpdated} />
        </span>
      </div>

      <p className="relative text-sm text-muted mt-2">{level.tagline}</p>

      <div className="relative flex flex-wrap gap-1.5 mt-3">
        <PollutantChip label="PM2.5" value={current?.pm25} />
        <PollutantChip label="PM10" value={current?.pm10} />
        <PollutantChip label="O₃" value={current?.ozone} />
        <PollutantChip label="NO₂" value={current?.no2} />
      </div>

      <div className="relative mt-4">
        <AqiScaleBar aqi={aqi} />
      </div>
    </div>
  );
}

/** Stat card — icon tile + small uppercase label + big number + sub line
 *  (+ optional delta badge / segment bars), the reference's left-column style. */
function StatCard({ icon: Icon, label, value, sub, iconColor = '#6c8cff', delta, children }) {
  return (
    <div className="glass glass-hover rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <span className="icon-tile">
          <Icon className="w-[18px] h-[18px]" style={{ color: iconColor }} aria-hidden="true" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted min-w-0 truncate">{label}</span>
        <DeltaBadge {...delta} />
      </div>
      <p className="mt-3 text-[34px] leading-none font-extrabold text-strong tracking-tight tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted mt-2 leading-snug">{sub}</p>}
      {children}
    </div>
  );
}

function SkyCard({ weatherCode, isDay, feelsLike, precipitation }) {
  const { label, Icon } = getWeatherMeta(weatherCode, isDay);
  return (
    <div className="glass glass-hover rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <span className="icon-tile">
          <Icon className="w-[18px] h-[18px] text-accent" aria-hidden="true" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">Sky</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <p className="text-[34px] leading-none font-extrabold text-strong tracking-tight truncate">{label}</p>
      </div>
      <p className="text-xs text-muted mt-2 leading-snug">
        Feels like {feelsLike == null ? '—' : `${Math.round(feelsLike)}°C`}
        {precipitation > 0 ? ` · ${precipitation} mm rain` : ''}
      </p>
    </div>
  );
}

/** Vertical dotted timeline of the stored 7-day history —
 *  the reference's sidebar "history" card (dot + label + right-aligned value). */
function HistoryTimeline({ series }) {
  const rows = series.slice(-7);
  if (rows.length < 2) return null;
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-strong tracking-tight">7-day history</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">AQI / day</span>
      </div>
      <div className="mt-4 ml-1 pl-5 border-l border-dashed border-white/10">
        {rows.map((d) => {
          const lv = getAQILevel(d.aqi);
          const date = d.date
            ? new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            : '';
          return (
            <div key={d.date} className="relative flex items-center gap-2.5 py-[7px]">
              <span
                className="absolute -left-[25px] w-2.5 h-2.5 rounded-full border border-void"
                style={{ background: lv.color, boxShadow: `0 0 10px ${lv.color}66` }}
                aria-hidden="true"
              />
              <span className="text-xs text-muted min-w-0 truncate">
                <span className="text-strong font-medium">{d.day}</span>
                {date ? ` · ${date}` : ''}
              </span>
              <span
                className="ml-auto text-xs font-bold tabular-nums shrink-0"
                style={{ color: d.aqi == null ? '#8b93a6' : lv.color }}
              >
                {d.aqi ?? '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard({
  location,
  weather,
  aqi,
  conditions,
  series,
  streak,
  activeProfile,
  activePersonaId,
  onSelectPersona,
  onUseCustom,
  customProfileName,
  sim,
  onSetSim,
  onOpenCompare,
  theme,
  onPickMap,
}) {
  const { advisory, loading, error, regenerate } = useAdvisory(activeProfile, conditions);

  const initialLoading = (weather.loading && !weather.data) || (aqi.loading && !aqi.data);
  // Full failure only when BOTH feeds are down with no data — a single
  // failing API (quota, hiccup) degrades gracefully instead of blanking.
  const hardError =
    (weather.error && !weather.data) && (aqi.error && !aqi.data);
  const softError = (weather.error || aqi.error) && (weather.data || aqi.data);

  const retry = () => {
    weather.refresh();
    aqi.refresh();
  };

  if (hardError) {
    return (
      <ErrorState
        icon={CloudOff}
        title="Live data is unreachable"
        message="We could not reach Open-Meteo just now. This is a data-transport issue, not a missing feature — check your connection and retry. Nothing is faked, so we show the truth."
        onRetry={retry}
      />
    );
  }

  if (initialLoading) {
    return (
      <div className="space-y-5" aria-busy="true" aria-label="Loading live conditions">
        <div className="h-4 w-64 rounded skeleton" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
          {/* left rail */}
          <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-4 order-2 lg:order-1">
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton className="hidden sm:block" />
            <MetricSkeleton className="hidden sm:block" />
          </div>
          {/* center */}
          <div className="lg:col-span-5 order-3 lg:order-2">
            <MapSkeleton />
          </div>
          {/* right rail */}
          <div className="lg:col-span-4 space-y-5 order-1 lg:order-3">
            <AqiHeroSkeleton />
            <MetricSkeleton />
          </div>
        </div>
      </div>
    );
  }

  const w = weather.data?.current || {};
  const today = weather.data?.daily?.[weather.data.daily.length - 1] || {};
  const liveAqi = aqi.data?.current?.usAqi;
  const yesterday = series.length >= 2 ? series[series.length - 2] : null;

  // Day-over-day deltas (display-only, derived from the existing history).
  const aqiDelta = liveAqi != null && yesterday?.aqi != null ? liveAqi - yesterday.aqi : null;
  const tempDelta = today.tMax != null && yesterday?.tMax != null ? today.tMax - yesterday.tMax : null;

  // Null-safe metric formatters (weather feed may be down while AQI is live).
  const num = (v, digits = 0) =>
    v === null || v === undefined || Number.isNaN(v) ? '—' : `${Math.round(v * 10 ** digits) / 10 ** digits}`;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      {/* soft refresh failure — data still on screen */}
      {softError && (
        <motion.div
          variants={item}
          className="flex items-center gap-2.5 glass rounded-xl px-4 py-2.5 text-xs text-amber-300/90 border border-amber-400/20"
          role="status"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="text-muted">
            Live refresh hiccup — showing the last good reading ({new Date(conditions?.fetchedAt).toLocaleTimeString()}).
          </span>
          <button
            onClick={retry}
            className="ml-auto inline-flex items-center gap-1.5 font-semibold text-amber-300/90 hover:text-amber-200 shrink-0"
          >
            <RotateCw className="w-3.5 h-3.5" /> Retry
          </button>
        </motion.div>
      )}

      {/* one-click demo personas */}
      <motion.div variants={item}>
        <PersonaQuickSelect
          activeId={activePersonaId}
          onSelectPersona={onSelectPersona}
          onUseCustom={onUseCustom}
          customProfileName={customProfileName}
        />
      </motion.div>

      {/* mission-control grid: stats | map hero + trend | status + advisory */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
        {/* left rail — icon-tile stat cards */}
        <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-4 order-2 lg:order-1">
          <motion.div variants={item} className="col-span-1 sm:col-span-1 lg:col-span-1">
            <StatCard
              icon={Thermometer}
              label="Temperature"
              iconColor="#f2984c"
              value={`${num(w.temperature)}°C`}
              sub={`Today ${today.tMin == null ? '—' : Math.round(today.tMin)}° / ${today.tMax == null ? '—' : Math.round(today.tMax)}°`}
              delta={{ delta: tempDelta, unit: '°', neutral: true }}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              icon={WindIcon}
              label="Wind"
              iconColor="#a9baff"
              value={w.windSpeed == null ? '—' : `${Math.round(w.windSpeed)} km/h`}
              sub={`from ${windDirectionLabel(w.windDirection) || '—'}`}
            >
              <SegmentBars className="mt-3" value={w.windSpeed} max={40} />
            </StatCard>
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              icon={Droplets}
              label="Humidity"
              iconColor="#6c8cff"
              value={`${num(w.humidity)}%`}
              sub={
                w.humidity == null
                  ? ''
                  : w.humidity < 30
                    ? 'Dry air'
                    : w.humidity <= 60
                      ? 'Comfortable'
                      : w.humidity <= 80
                        ? 'Humid'
                        : 'Very humid'
              }
            >
              <SegmentBars className="mt-3" value={w.humidity} max={100} />
            </StatCard>
          </motion.div>
          <motion.div variants={item} className="col-span-2 lg:col-span-1">
            <SkyCard weatherCode={w.weatherCode} isDay={w.isDay} feelsLike={w.feelsLike} precipitation={w.precipitation} />
          </motion.div>
          <motion.div variants={item} className="col-span-2 lg:col-span-1">
            <HistoryTimeline series={series} />
          </motion.div>
        </div>

        {/* center — the map hero + 7-day trend */}
        <div className="sm:col-span-2 lg:col-span-5 space-y-5 order-3 lg:order-2">
          <motion.div variants={item} className="glass rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-strong tracking-tight">Location map</h3>
              <span className="text-[11px] text-muted">pin color = live AQI severity</span>
            </div>
            <MapView
              location={location}
              aqi={liveAqi}
              theme={theme}
              onPick={onPickMap}
              loading={weather.loading}
            />
          </motion.div>

          <motion.div variants={item} className="glass rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-strong tracking-tight">7-day trend</h3>
              <StreakBadge streak={streak} />
            </div>
            {/* "analytic view" summary — segment-bar indicators over the history */}
            {series.length >= 2 && (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
                    Avg AQI{' '}
                    <span className="text-strong font-mono normal-case tracking-normal">
                      {Math.round(series.reduce((s, d) => s + (d.aqi ?? 0), 0) / series.filter((d) => d.aqi != null).length)}
                    </span>
                  </p>
                  <SegmentBars
                    value={series.reduce((s, d) => s + (d.aqi ?? 0), 0) / series.filter((d) => d.aqi != null).length}
                    max={200}
                    color={aqiColor(Math.round(series.reduce((s, d) => s + (d.aqi ?? 0), 0) / series.filter((d) => d.aqi != null).length))}
                    segments={10}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
                    Avg high{' '}
                    <span className="text-strong font-mono normal-case tracking-normal">
                      {Math.round(series.reduce((s, d) => s + (d.tMax ?? 0), 0) / series.filter((d) => d.tMax != null).length)}°C
                    </span>
                  </p>
                  <SegmentBars
                    value={series.reduce((s, d) => s + (d.tMax ?? 0), 0) / series.filter((d) => d.tMax != null).length}
                    max={45}
                    color="#f2984c"
                    segments={10}
                  />
                </div>
              </div>
            )}
            {series.length >= 2 ? (
              <TrendChart series={series} />
            ) : (
              <p className="text-sm text-muted py-10 text-center">
                Building history from live data — the trend appears after the first readings settle.
              </p>
            )}
          </motion.div>
        </div>

        {/* right rail — AQI status + personalized advisory + what-if */}
        <div className="sm:col-span-2 lg:col-span-4 space-y-5 order-1 lg:order-3">
          <motion.div variants={item}>
            <AqiHero
              aqi={liveAqi}
              location={location}
              aqiData={aqi.data}
              lastUpdated={aqi.lastUpdated}
              delta={aqiDelta}
            />
          </motion.div>
          <motion.div variants={item}>
            <AdvisoryCard
              advisory={advisory}
              loading={loading}
              error={error}
              profile={activeProfile}
              conditions={conditions}
              onRegenerate={regenerate}
              onOpenCompare={onOpenCompare}
            />
          </motion.div>
          <motion.div variants={item}>
            <WhatIfSimulator sim={sim} onSetSim={onSetSim} liveAqi={liveAqi} liveTemp={w.temperature ?? 25} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
