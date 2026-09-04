import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Save, UserRound, X } from 'lucide-react';
import { AGE_GROUPS, HEALTH_CONDITIONS, OCCUPATIONS } from '../lib/personas';
import { cn } from '../lib/utils';

/**
 * ProfileForm — slide-in panel for the user's own health profile.
 * Saved to localStorage (via the storage layer) and instantly applied:
 * the advisory regenerates as soon as you save.
 */

export default function ProfileForm({ open, profile, onSave, onClose }) {
  const [draft, setDraft] = useState(profile);

  // Re-seed the draft each time the panel opens.
  useEffect(() => {
    if (open) setDraft(profile);
  }, [open, profile]);

  const toggleCondition = (value) => {
    setDraft((d) => ({
      ...d,
      conditions: d.conditions?.includes(value)
        ? d.conditions.filter((c) => c !== value)
        : [...(d.conditions || []), value],
    }));
  };

  const save = () => {
    const clean = {
      ...draft,
      name: (draft.name || '').trim() || 'My Profile',
      conditions: draft.conditions || [],
    };
    onSave(clean);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.aside
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md glass-strong p-6 overflow-y-auto"
            role="dialog"
            aria-label="Edit health profile"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5">
                <span className="icon-tile !w-9 !h-9 !rounded-lg bg-accent/10 border-accent/25">
                  <UserRound className="w-[18px] h-[18px] text-accent-soft" />
                </span>
                <h2 className="text-lg font-extrabold text-strong">Your health profile</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close profile panel"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-strong hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted mb-6 leading-relaxed">
              Saved on this device only. The advisory rewrites itself the moment you save.
            </p>

            <div className="space-y-6">
              {/* name */}
              <div className="space-y-2">
                <label htmlFor="profile-name" className="block text-xs font-bold uppercase tracking-wider text-muted">
                  Profile name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={draft?.name || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Me, or a family member"
                  maxLength={40}
                  className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-strong outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-muted/60"
                />
              </div>

              {/* age group */}
              <div className="space-y-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-muted">Age group</span>
                <div className="grid grid-cols-2 gap-2">
                  {AGE_GROUPS.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => setDraft((d) => ({ ...d, ageGroup: a.value }))}
                      className={cn(
                        'rounded-xl px-3 py-2.5 text-sm border transition-colors flex items-center gap-2',
                        draft?.ageGroup === a.value
                          ? 'bg-accent/15 border-accent/45 text-accent-soft font-semibold'
                          : 'bg-white/[0.04] border-white/[0.09] text-muted hover:border-accent/30'
                      )}
                      aria-pressed={draft?.ageGroup === a.value}
                    >
                      <a.Icon className="w-4 h-4 shrink-0" />
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* conditions (multi-select) */}
              <div className="space-y-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-muted">
                  Health conditions <span className="normal-case font-medium">(tap to toggle)</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {HEALTH_CONDITIONS.map((c) => {
                    const on = draft?.conditions?.includes(c.value);
                    return (
                      <button
                        key={c.value}
                        onClick={() => toggleCondition(c.value)}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm border transition-colors',
                          on
                            ? 'bg-accent/15 border-accent/45 text-accent-soft font-semibold'
                            : 'bg-white/[0.04] border-white/[0.09] text-muted hover:border-accent/30'
                        )}
                        aria-pressed={on}
                      >
                        <c.Icon className="w-4 h-4" />
                        {c.label}
                      </button>
                    );
                  })}
                  <span className="text-[11px] text-muted self-center">none selected = healthy adult</span>
                </div>
              </div>

              {/* occupation */}
              <div className="space-y-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-muted">
                  Daily exposure
                </span>
                <div className="grid gap-2">
                  {OCCUPATIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setDraft((d) => ({ ...d, occupation: o.value }))}
                      className={cn(
                        'rounded-xl px-3.5 py-2.5 text-sm border transition-colors flex items-center gap-2.5 text-left',
                        draft?.occupation === o.value
                          ? 'bg-accent/15 border-accent/45 text-accent-soft font-semibold'
                          : 'bg-white/[0.04] border-white/[0.09] text-muted hover:border-accent/30'
                      )}
                      aria-pressed={draft?.occupation === o.value}
                    >
                      <o.Icon className="w-4 h-4 shrink-0" />
                      <span>
                        {o.label}
                        <span className="block text-[11px] font-normal text-muted mt-0.5">{o.phrase}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* actions */}
            <div className="mt-8 flex gap-3">
              <button
                onClick={save}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent/90 text-white font-bold text-sm py-3 hover:bg-accent transition shadow-lg shadow-accent/25"
              >
                <Save className="w-4 h-4" />
                Save &amp; apply
              </button>
              <button
                onClick={onClose}
                className="px-5 rounded-xl border border-white/[0.09] bg-white/[0.04] text-sm font-semibold text-muted hover:text-strong transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
