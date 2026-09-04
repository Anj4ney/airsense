import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { aqiGradient, aqiRGBA, isHazardousLevel } from '../lib/aqiTheme';
import { isSensitiveProfile, personaPhrase } from '../lib/personas';

/**
 * AlertBanner — animated, dismissible slide-down banner that appears when
 * live AQI crosses into "Unhealthy" or worse. Dismissing hides it for the
 * CURRENT reading; the next hazardous reading (auto-refresh or new location)
 * brings it back.
 */
export default function AlertBanner({ level, aqi, cityName, profile, readingId }) {
  const [dismissedFor, setDismissedFor] = useState(null);
  const visible = isHazardousLevel(level) && aqi !== null && aqi !== undefined && dismissedFor !== readingId;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="hazard-banner"
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -64, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          role="alert"
          className="relative rounded-2xl border overflow-hidden flex items-start gap-3 p-4 pl-5 backdrop-blur-xl"
          style={{
            borderColor: aqiRGBA(aqi, 0.45),
            background: `linear-gradient(90deg, ${aqiRGBA(aqi, 0.22)}, ${aqiRGBA(aqi, 0.05)})`,
            boxShadow: `0 16px 48px -18px ${aqiRGBA(aqi, 0.45)}`,
          }}
        >
          <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: aqiGradient(aqi) }} />
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" style={{ color: level.color }} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm sm:text-base flex items-center gap-2 flex-wrap text-strong">
              {level.label} air quality in {cityName}
              <span
                className="font-mono text-xs px-2 py-0.5 rounded-full border"
                style={{ background: aqiRGBA(aqi, 0.22), borderColor: aqiRGBA(aqi, 0.4), color: level.color }}
              >
                AQI {aqi}
              </span>
            </p>
            <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
              {isSensitiveProfile(profile)
                ? `Viewing as ${personaPhrase(profile)} — a high-risk group for this air. Your personalized advisory is below.`
                : 'Sensitive groups — children, older adults, asthma and heart patients — should limit outdoor exertion right now.'}
            </p>
          </div>
          <button
            onClick={() => setDismissedFor(readingId)}
            aria-label="Dismiss alert"
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-strong hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
