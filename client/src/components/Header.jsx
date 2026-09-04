import { LocateFixed, Moon, Sun, User, Wind } from 'lucide-react';
import SearchBar from './SearchBar';
import { cn } from '../lib/utils';

/**
 * Header — sticky glass bar: brand, live pill, city search, locate /
 * theme / profile actions. Wraps gracefully at 375px.
 * "Planet.ai" restyle: dark hairline glass, accent logo tile, circular
 * action buttons, profile shown as a user pill (same handlers as before).
 */

function IconButton({ onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-accent-soft border border-white/[0.08] bg-white/[0.04] hover:border-accent/40 transition-colors"
    >
      {children}
    </button>
  );
}

export default function Header({
  theme,
  onToggleTheme,
  onEditProfile,
  onLocate,
  locating = false,
  onSelectLocation,
}) {
  return (
    <header className="sticky top-0 z-40 glass border-b border-white/[0.06] rounded-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mr-1">
          <span className="icon-tile !rounded-xl">
            <Wind className="w-[18px] h-[18px] text-accent" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className={cn('block font-extrabold text-lg tracking-tight text-strong')}>AirSense</span>
            <span className="block text-[10px] text-muted -mt-0.5 hidden sm:block">
              personal air &amp; weather health advisory
            </span>
          </span>
          <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-up/90 bg-up/10 border border-up/25 rounded-full px-2.5 py-1 ml-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-up opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-up" />
            </span>
            LIVE
          </span>
        </div>

        {/* City search — wraps to its own row on mobile */}
        <div className="order-3 sm:order-2 w-full sm:w-auto sm:flex-1 sm:max-w-md sm:mx-auto">
          <SearchBar onSelect={onSelectLocation} />
        </div>

        {/* Actions */}
        <div className="order-2 sm:order-3 flex items-center gap-2 ml-auto sm:ml-0">
          <IconButton onClick={onLocate} title="Use my location">
            <LocateFixed className={cn('w-[17px] h-[17px]', locating && 'animate-pulse text-accent')} />
          </IconButton>
          <IconButton onClick={onToggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? <Sun className="w-[17px] h-[17px]" /> : <Moon className="w-[17px] h-[17px]" />}
          </IconButton>
          <button
            onClick={onEditProfile}
            title="Edit your health profile"
            aria-label="Edit your health profile"
            className="inline-flex items-center gap-2 h-9 rounded-full pl-1.5 pr-3 border border-white/[0.08] bg-white/[0.04] hover:border-accent/40 transition-colors group"
          >
            <span className="w-6 h-6 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-accent-soft" aria-hidden="true" />
            </span>
            <span className="hidden sm:inline text-xs font-semibold text-muted group-hover:text-accent-soft transition-colors">
              My profile
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
