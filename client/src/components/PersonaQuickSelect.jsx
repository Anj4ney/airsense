import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles, UserRoundCheck } from 'lucide-react';
import { PERSONAS } from '../lib/personas';
import { cn } from '../lib/utils';

/**
 * PersonaQuickSelect — one-click demo profiles.
 * Clicking instantly swaps the active profile and the advisory regenerates
 * with a smooth transition: judges SEE personalization without a form.
 * Restyle: a glass segmented pill bar — the active persona is a filled
 * rounded pill (matching the nav's active-tab treatment).
 */
export default function PersonaQuickSelect({ activeId, onSelectPersona, onUseCustom, customProfileName }) {
  return (
    <section aria-label="Quick demo profiles" className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4 text-accent" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-strong tracking-tight">
          Try a persona — watch the advisory rewrite itself
        </h2>
        <span className="text-xs text-muted hidden sm:inline">same live air, different advice</span>
      </div>

      <div className="glass rounded-2xl sm:rounded-full p-1.5 grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-1">
        {PERSONAS.map((p) => {
          const active = activeId === p.id;
          return (
            <motion.button
              key={p.id}
              onClick={() => onSelectPersona(p)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className={cn(
                'relative rounded-xl sm:rounded-full px-4 py-2.5 text-left transition-colors overflow-hidden',
                active
                  ? 'bg-white/[0.09] border border-white/[0.14] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.8)]'
                  : 'border border-transparent hover:bg-white/[0.04]'
              )}
              aria-pressed={active}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl leading-none select-none shrink-0" aria-hidden="true">
                  {p.emoji}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block font-bold text-sm truncate',
                      active ? 'text-strong' : 'text-muted'
                    )}
                  >
                    {p.title}
                  </span>
                  <span
                    className={cn(
                      'block text-[11px] mt-0.5 leading-snug truncate hidden md:block',
                      active ? 'text-muted' : 'text-muted/70'
                    )}
                  >
                    {p.subtitle}
                  </span>
                </span>
              </div>
              {active && (
                <motion.span
                  layoutId="persona-active-ring"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-accent pointer-events-none"
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                />
              )}
              {active && <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-accent" aria-hidden="true" />}
            </motion.button>
          );
        })}
      </div>

      {activeId !== 'custom' && (
        <button
          onClick={onUseCustom}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent-soft transition-colors px-1"
        >
          <UserRoundCheck className="w-3.5 h-3.5" />
          Back to my saved profile{customProfileName ? ` (${customProfileName})` : ''}
        </button>
      )}
    </section>
  );
}
