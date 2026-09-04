import { Flame, Leaf, Minus } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * StreakBadge — gamified air-quality streak from the stored 7-day history.
 *  • Good streak   -> leaf, green (up)
 *  • Worsening     -> flame, orange (AQI trending up)
 *  • Otherwise     -> neutral "steady" chip
 * Quiet tinted pills in the new palette.
 */

const STYLES = {
  good: {
    Icon: Leaf,
    wrap: 'bg-up/10 border-up/25 text-up',
    countWrap: 'bg-up/20 text-up',
  },
  worsening: {
    Icon: Flame,
    wrap: 'bg-[#f2984c]/10 border-[#f2984c]/30 text-[#f2b06c]',
    countWrap: 'bg-[#f2984c]/20 text-[#f2b06c]',
  },
  steady: {
    Icon: Minus,
    wrap: 'bg-white/[0.04] border-white/[0.1] text-muted',
    countWrap: 'bg-white/[0.08] text-muted',
  },
};

export default function StreakBadge({ streak }) {
  if (!streak) return null;
  const s = STYLES[streak.type] || STYLES.steady;
  const { Icon } = s;

  return (
    <div
      className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold', s.wrap)}
      title={streak.label}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span className="text-muted font-medium">Air streak:</span>
      <span>{streak.label}</span>
      {streak.count > 0 && (
        <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold', s.countWrap)}>
          {streak.count}
        </span>
      )}
    </div>
  );
}
