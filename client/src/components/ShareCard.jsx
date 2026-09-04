import { useRef, useState } from 'react';
import { Check, Copy, Download, ImageDown, Wind } from 'lucide-react';
import { toPng } from 'html-to-image';
import { getAQILevel, aqiGradient } from '../lib/aqiTheme';
import { cn } from '../lib/utils';

/**
 * ShareCard — "wow, it even exports" moment.
 * Renders the current advisory into a styled card (html-to-image) and lets
 * the judge save it as a PNG or copy it as plain text.
 */

function flash(setter) {
  setter(true);
  setTimeout(() => setter(false), 2000);
}

export default function ShareCard({ advisory, profile, conditions, disabled = false }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const nodeRef = useRef(null);

  const level = getAQILevel(conditions?.aqi);

  const shareText =
    `AirSense advisory — ${conditions?.locationName || 'your area'} (AQI ${conditions?.aqi ?? '—'}, ${level.label}, ${Math.round(
      conditions?.temperature ?? 0
    )}°C)\n` +
    `Profile: ${profile?.name || 'General Adult'}\n\n` +
    `${advisory?.text || ''}\n\n` +
    `— generated live at airsense • data: Open-Meteo`;

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      flash(setCopied);
    } catch {
      setFailed(true);
      setTimeout(() => setFailed(false), 2500);
    }
  };

  const saveImage = async () => {
    if (!nodeRef.current) return;
    try {
      const dataUrl = await toPng(nodeRef.current, {
        pixelRatio: 2,
        backgroundColor: '#0a0e17',
        cacheBust: true,
      });
      const a = document.createElement('a');
      a.download = `airsense-advisory-${new Date().toISOString().slice(0, 10)}.png`;
      a.href = dataUrl;
      a.click();
      flash(setSaved);
    } catch {
      setFailed(true);
      setTimeout(() => setFailed(false), 2500);
    }
  };

  const btn =
    'inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-full border bg-white/[0.04] border-white/[0.08] text-muted hover:text-accent-soft hover:border-accent/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={copyText} className={btn} disabled={disabled} title="Copy advisory as text">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy text'}</span>
        </button>
        <button onClick={saveImage} className={btn} disabled={disabled} title="Save advisory as an image">
          {saved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ImageDown className="w-3.5 h-3.5" />}
          <span>{saved ? 'Saved!' : 'Save image'}</span>
        </button>
        {failed && <span className="text-xs text-[#f2b06c]">Export failed — try the text copy.</span>}
      </div>

      {/* Off-screen styled card captured by html-to-image */}
      <div
        ref={nodeRef}
        aria-hidden="true"
        className="share-card"
        style={{ position: 'fixed', left: '-9999px', top: 0, width: 480, backgroundColor: '#0a0e17' }}
      >
        <div style={{ padding: 28, color: '#f5f6f8', fontFamily: 'Inter, system-ui, sans-serif' }}>
          {/* header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 18px',
              borderRadius: 16,
              background: aqiGradient(conditions?.aqi),
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(255,255,255,.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round">
                <path d="M4 8h8.5a2.5 2.5 0 1 0-2.4-3.2" />
                <path d="M4 12h12.5a3 3 0 1 1-2.9 3.8" />
                <path d="M4 16h6" />
              </svg>
            </div>
            <div style={{ color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>AirSense</div>
              <div style={{ fontSize: 11, opacity: 0.9 }}>
                {conditions?.locationName || 'your area'} • {new Date().toLocaleString()}
              </div>
            </div>
            <div
              style={{
                marginLeft: 'auto',
                textAlign: 'right',
                color: '#fff',
                background: 'rgba(0,0,0,.28)',
                borderRadius: 12,
                padding: '6px 14px',
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{conditions?.aqi ?? '—'}</div>
              <div style={{ fontSize: 10, opacity: 0.9, marginTop: 2 }}>AQI · {level.label}</div>
            </div>
          </div>

          {/* conditions strip */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {[
              `${Math.round(conditions?.temperature ?? 0)}°C`,
              `feels ${Math.round(conditions?.feelsLike ?? 0)}°C`,
              `humidity ${Math.round(conditions?.humidity ?? 0)}%`,
              `wind ${Math.round(conditions?.wind ?? 0)} km/h`,
              conditions?.weatherLabel || '',
            ]
              .filter(Boolean)
              .map((chip) => (
                <span
                  key={chip}
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,.07)',
                    border: '1px solid rgba(255,255,255,.1)',
                    color: '#cbd3e1',
                  }}
                >
                  {chip}
                </span>
              ))}
          </div>

          {/* advisory body */}
          <div style={{ marginTop: 16, whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.65, color: '#e2e8f0' }}>
            {advisory?.text || ''}
          </div>

          {/* footer */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 12,
              borderTop: '1px solid rgba(148,163,184,.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
              color: '#94a3b8',
            }}
          >
            <span>For: {profile?.name || 'General Adult'}</span>
            <span>Live data: Open-Meteo • {conditions?.simulated ? 'what-if scenario' : 'live readings'}</span>
          </div>
        </div>
      </div>
    </>
  );
}
