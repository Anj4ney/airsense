import { motion } from 'framer-motion';
import { RotateCw } from 'lucide-react';

/**
 * ErrorState — friendly, actionable failure state with a retry button.
 * Used when weather/AQI APIs are unreachable or geolocation is denied.
 * Restyled into the dark glass system — same messaging and retry logic.
 */
export default function ErrorState({
  icon: Icon,
  title = 'Something went wrong',
  message,
  onRetry,
  compact = false,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl flex flex-col items-center justify-center text-center gap-3 px-6"
      style={compact ? { padding: '22px 24px' } : { padding: '48px 24px' }}
      role="alert"
    >
      <div className="icon-tile !w-14 !h-14 !rounded-2xl bg-accent/[0.08] border-accent/20">
        {Icon ? (
          <Icon className="w-7 h-7 text-accent" />
        ) : (
          <span aria-hidden="true">:(</span>
        )}
      </div>
      <h3 className="font-bold text-strong">{title}</h3>
      {message && <p className="text-sm text-muted max-w-sm leading-relaxed">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full bg-accent/15 border border-accent/30 text-accent-soft hover:bg-accent/25 transition-colors"
        >
          <RotateCw className="w-4 h-4" />
          Try again
        </button>
      )}
    </motion.div>
  );
}
