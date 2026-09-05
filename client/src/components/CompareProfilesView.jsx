import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Droplets, Gauge, MapPin, Split, Thermometer, Wind } from 'lucide-react';
import { PERSONAS } from '../lib/personas';
import { useAdvisory } from '../hooks/useAdvisory';
import { AdvisoryBody } from './AdvisoryCard';
import { AdvisorySkeleton } from './SkeletonLoader';
import { getAQILevel, aqiColor, aqiRGBA } from '../lib/aqiTheme';
import { cn } from '../lib/utils';

/**
 * CompareProfilesView — the single most persuasive demo feature.
 * Two profiles, the SAME live conditions, two visibly different advisories,
 * side by side. Only the person changes — everything else is identical.
 */

function SidePanel({ options, selectedId, onSelect, advisory, loading, accent, sideLabel }) {
  return (
    <div className="glass glass-hover rounded-2xl p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[10px] font-bold tracking-widest uppercase text-muted">{sideLabel}</span>
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          aria-label={`Profile for ${sideLabel}`}
          className="select-surface rounded-lg text-sm px-3 py-1.5 text-strong outline-none focus:ring-2 focus:ring-accent/50 max-w-[70%]"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-h-[200px]">
        {loading && !advisory ? (
          <AdvisorySkeleton />
        ) : advisory ? (
          <AdvisoryBody key={`${advisory.generatedAt}-${selectedId}`} text={advisory.text} accent={accent} />
        ) : (
          <AdvisorySkeleton />
        )}
      </div>
      {advisory && (
        <span className="text-[10px] text-muted font-semibold tracking-wide uppercase">
          {advisory.source === 'groq' ? 'AI · Groq' : 'Smart rules engine'}
        </span>
      )}
    </div>
  );
}

export default function CompareProfilesView({ conditions, savedProfile }) {
  const options = [
    { id: 'custom', label: savedProfile?.name || 'Your profile', profile: savedProfile },
    ...PERSONAS.map((p) => ({ id: p.id, label: `${p.emoji} ${p.title}`, profile: p.profile })),
  ];

  const [leftId, setLeftId] = useState('asthma');
  const [rightId, setRightId] = useState('athlete');
  const left = options.find((o) => o.id === leftId) || options[1];
  const right = options.find((o) => o.id === rightId) || options[2];

  // Both hooks watch the SAME conditions object — only the profile differs.
  const { advisory: advA, loading: loadA } = useAdvisory(left.profile, conditions, { debounce: 600 });
  const { advisory: advB, loading: loadB } = useAdvisory(right.profile, conditions, { debounce: 600 });

  const level = getAQILevel(conditions?.aqi);
  const accent = level.color;
  const differ = advA && advB && advA.text !== advB.text;

  const chips = [
    { Icon: MapPin, text: conditions?.locationName || '—' },
    { Icon: Gauge, text: `AQI ${conditions?.aqi ?? '—'} · ${level.label}`, color: level.color },
    { Icon: Thermometer, text: `${Math.round(conditions?.temperature ?? 0)}°C` },
    { Icon: Droplets, text: `${Math.round(conditions?.humidity ?? 0)}%` },
    { Icon: Wind, text: `${Math.round(conditions?.wind ?? 0)} km/h` },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
      aria-label="Compare profiles"
    >
      {/* header */}
      <div className="glass rounded-2xl p-5 sm:p-6 space-y-4 relative overflow-hidden">
        <div
          className="absolute -right-20 -top-24 w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ background: aqiRGBA(conditions?.aqi, 0.12) }}
        />
        <div className="flex items-center gap-2.5 relative">
          <span className="icon-tile !w-9 !h-9 !rounded-lg bg-accent/10 border-accent/25">
            <Split className="w-[18px] h-[18px] text-accent-soft" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-strong tracking-tight">Same air. Different advice.</h2>
            <p className="text-xs text-muted mt-0.5">
              Both advisories come from the exact same live readings — only the person changes.
              {conditions?.simulated && (
                <span className="text-[#f2b06c] font-semibold"> (currently using what-if values)</span>
              )}
            </p>
          </div>
        </div>

        {/* shared live conditions strip */}
        <div className="flex flex-wrap gap-2 relative">
          {chips.map(({ Icon, text, color }, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-muted"
            >
              <Icon className="w-3.5 h-3.5" style={color ? { color } : undefined} aria-hidden="true" />
              <span className={color ? 'font-semibold' : undefined} style={color ? { color } : undefined}>
                {text}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* the two panels */}
      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6 relative">
        <div
          className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full glass items-center justify-center shadow-xl pointer-events-none"
          aria-hidden="true"
        >
          <span className="font-extrabold text-sm text-accent-soft">VS</span>
        </div>
        <SidePanel
          sideLabel="Profile A"
          options={options}
          selectedId={leftId}
          onSelect={setLeftId}
          advisory={advA}
          loading={loadA}
          accent={accent}
        />
        <SidePanel
          sideLabel="Profile B"
          options={options}
          selectedId={rightId}
          onSelect={setRightId}
          advisory={advB}
          loading={loadB}
          accent={accent}
        />
      </div>

      {/* insight strip */}
      <div className="glass rounded-2xl px-5 py-4 flex items-center gap-3 flex-wrap">
        {differ ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-up shrink-0" aria-hidden="true" />
            <p className="text-sm text-strong">
              <span className="font-bold">Personalization is working</span>
              <span className="text-muted"> — swap the dropdowns and watch each advisory rewrite for its person.</span>
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">
            Advisories look identical — try two different profiles (e.g. Asthma vs Athlete).
          </p>
        )}
        <span
          className={cn('ml-auto pill')}
          style={{
            color: aqiColor(conditions?.aqi),
            borderColor: aqiRGBA(conditions?.aqi, 0.35),
            background: aqiRGBA(conditions?.aqi, 0.1),
          }}
        >
          {conditions?.simulated ? 'What-if values' : 'Live readings'}
        </span>
      </div>
    </motion.section>
  );
}
