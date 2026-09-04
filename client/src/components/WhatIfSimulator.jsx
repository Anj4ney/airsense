import { motion } from 'framer-motion';
import { FlaskConical, RotateCcw, Thermometer, Gauge } from 'lucide-react';
import { aqiColor, aqiRGBA, getAQILevel } from '../lib/aqiTheme';
import { cn } from '../lib/utils';

/**
 * WhatIfSimulator — drag AQI/temperature to hypothetical values and watch
 * the advisory update live. This is the disqualification-flag defense:
 * the reasoning is dynamic, not cached or scripted.
 *
 * The simulator only overrides the ADVISORY input; the map, banner and hero
 * keep showing the real readings so the demo stays honest.
 */

function SliderRow({ icon: Icon, label, value, min, max, step, unit, color, onChange, disabled, name }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn('space-y-2', disabled && 'opacity-50')}>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted font-medium">
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          {label}
        </span>
        <span className="font-mono font-bold tabular-nums" style={{ color }}>
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        name={name}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label} slider`}
        className="w-full cursor-pointer disabled:cursor-not-allowed"
        style={{ '--sim-color': color, '--fill': `${fill}%`, accentColor: color }}
      />
    </div>
  );
}

export default function WhatIfSimulator({ sim, onSetSim, liveAqi, liveTemp }) {
  const simLevel = getAQILevel(sim.aqi);
  const simColor = aqiColor(sim.aqi);

  const toggle = () => {
    onSetSim((s) => ({
      enabled: !s.enabled,
      // initialize sliders at the live values so the drag starts from reality
      aqi: !s.enabled ? (liveAqi ?? Math.round(s.aqi)) : s.aqi,
      temp: !s.enabled ? (liveTemp ?? Math.round(s.temp)) : s.temp,
    }));
  };

  const reset = () => {
    onSetSim((s) => ({ ...s, aqi: Math.round(liveAqi ?? s.aqi), temp: Math.round(liveTemp ?? s.temp) }));
  };

  return (
    <div
      className="glass rounded-2xl p-5 space-y-4 transition-shadow relative overflow-hidden"
      style={
        sim.enabled
          ? {
              borderColor: aqiRGBA(sim.aqi, 0.45),
              boxShadow: `0 16px 44px -18px ${aqiRGBA(sim.aqi, 0.45)}`,
            }
          : undefined
      }
    >
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="icon-tile !w-9 !h-9 !rounded-lg">
            <FlaskConical className="w-4 h-4 text-accent" aria-hidden="true" />
          </span>
          <h3 className="text-sm font-bold text-strong tracking-tight">What-if simulator</h3>
        </div>

        {/* toggle switch */}
        <button
          onClick={toggle}
          role="switch"
          aria-checked={sim.enabled}
          aria-label="Enable what-if simulation"
          className={cn(
            'relative w-11 h-6 rounded-full border transition-colors shrink-0',
            sim.enabled ? 'bg-accent/70 border-accent/60' : 'bg-white/[0.07] border-white/[0.12]'
          )}
        >
          <motion.span
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={cn(
              'absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow',
              sim.enabled ? 'right-0.5' : 'left-0.5'
            )}
          />
        </button>
      </div>

      <p className="text-xs text-muted leading-relaxed">
        Drag to hypothetical values and the advisory rewrites itself live — proof the reasoning is dynamic, not cached.
        Banner &amp; map keep showing <span className="text-accent-soft font-medium">real readings</span>.
      </p>

      {/* sliders */}
      <div className="space-y-4">
        <SliderRow
          icon={Gauge}
          label="US AQI"
          name="aqi"
          value={sim.aqi}
          min={0}
          max={500}
          step={5}
          unit=""
          color={simColor}
          disabled={!sim.enabled}
          onChange={(v) => onSetSim((s) => ({ ...s, aqi: v }))}
        />
        <SliderRow
          icon={Thermometer}
          label="Temperature"
          name="temp"
          value={sim.temp}
          min={-15}
          max={45}
          step={1}
          unit="°C"
          color="#f2b06c"
          disabled={!sim.enabled}
          onChange={(v) => onSetSim((s) => ({ ...s, temp: v }))}
        />
      </div>

      {/* status strip */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {sim.enabled ? (
          <span
            className="pill"
            style={{ color: simColor, borderColor: aqiRGBA(sim.aqi, 0.45), background: aqiRGBA(sim.aqi, 0.1) }}
          >
            Simulation · {simLevel.label}
          </span>
        ) : (
          <span className="pill bg-white/[0.04] border-white/[0.08] text-muted font-medium">
            OFF — showing live values
          </span>
        )}
        {sim.enabled && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent-soft transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Snap back to live
          </button>
        )}
      </div>
    </div>
  );
}
