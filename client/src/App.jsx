import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, Split, X, MapPinOff } from 'lucide-react';
import Header from './components/Header';
import AlertBanner from './components/AlertBanner';
import Dashboard from './components/Dashboard';
import CompareProfilesView from './components/CompareProfilesView';
import ProfileForm from './components/ProfileForm';
import { useGeolocation } from './hooks/useGeolocation';
import { useWeather } from './hooks/useWeather';
import { useAQI } from './hooks/useAQI';
import { useLocalHistory } from './hooks/useLocalHistory';
import { reverseGeocode } from './lib/api';
import { getAQILevel, aqiColor, aqiRGBA } from './lib/aqiTheme';
import { getWeatherMeta } from './lib/weatherCodes';
import { DEFAULT_PROFILE, PERSONAS } from './lib/personas';
import { loadLocation, loadProfile, loadTheme, saveLocation, saveProfile, saveTheme } from './lib/storage';
import { cn } from './lib/utils';

/** Fallback city when geolocation is unavailable — real live data, just pre-picked. */
const DEFAULT_LOCATION = { name: 'New Delhi, India', lat: 28.6139, lon: 77.209, source: 'default' };

/** Ambient background — the CSS layer paints the starfield; this component
 *  adds the soft radial glow tinted by the live AQI severity color. */
function BackgroundOrbs({ aqi }) {
  const color = aqiColor(aqi);
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <div
        className="absolute -top-48 right-[6%] w-[38rem] h-[38rem] rounded-full blur-3xl opacity-[0.13] animate-drift transition-colors duration-1000"
        style={{ background: `radial-gradient(circle, ${color}, transparent 65%)` }}
      />
      <div
        className="absolute top-[38%] -left-48 w-[30rem] h-[30rem] rounded-full blur-3xl opacity-[0.08] animate-drift"
        style={{ background: 'radial-gradient(circle, #6c8cff, transparent 65%)', animationDelay: '-7s' }}
      />
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children, highlight }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all',
        active
          ? 'bg-white/[0.09] border border-white/[0.14] text-strong shadow-[0_8px_24px_-12px_rgba(0,0,0,0.8)]'
          : 'text-muted hover:text-strong hover:bg-white/[0.04] border border-transparent'
      )}
    >
      <Icon className={cn('w-4 h-4', active && 'text-accent')} aria-hidden="true" />
      {children}
      {highlight && !active && (
        <span className="hidden md:inline text-[9px] font-bold uppercase tracking-wider text-accent-soft/90 bg-accent/10 border border-accent/25 rounded-full px-2 py-0.5">
          see how advice changes
        </span>
      )}
    </button>
  );
}

export default function App() {
  // ── theme ─────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => loadTheme());
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    saveTheme(theme);
  }, [theme]);

  // ── profile ───────────────────────────────────────────────────────────────
  const [savedProfile, setSavedProfile] = useState(() => loadProfile() || DEFAULT_PROFILE);
  const [activePersonaId, setActivePersonaId] = useState('custom');
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);

  const activePersona = PERSONAS.find((p) => p.id === activePersonaId);
  const activeProfile = activePersona ? activePersona.profile : savedProfile;

  const handleSaveProfile = (profile) => {
    setSavedProfile(profile);
    saveProfile(profile);
    setActivePersonaId('custom'); // instantly apply
    setProfilePanelOpen(false);
  };

  // ── location (localStorage -> geolocation -> default city) ────────────────
  const [initialLocation] = useState(() => loadLocation());
  const [location, setLocation] = useState(() => initialLocation || null);
  const [geoNotice, setGeoNotice] = useState(null);
  const geo = useGeolocation();
  const applyGeoRef = useRef(!initialLocation);

  // First load without a saved location: auto-detect.
  useEffect(() => {
    if (!initialLocation) geo.request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GPS resolved (auto-detect OR the locate button) -> use it.
  useEffect(() => {
    if (geo.status === 'granted' && geo.coords && applyGeoRef.current) {
      applyGeoRef.current = false;
      setGeoNotice(null);
      const { lat, lon } = geo.coords;
      reverseGeocode(lat, lon).then((r) => {
        setLocation({
          name: [r.name, r.country].filter(Boolean).join(', '),
          lat,
          lon,
          source: 'gps',
        });
      });
    }
  }, [geo.status, geo.coords]);

  // GPS failed -> friendly notice + live default city (never a blank screen).
  useEffect(() => {
    if (['denied', 'timeout', 'error', 'unsupported'].includes(geo.status) && !location) {
      setLocation(DEFAULT_LOCATION);
      setGeoNotice(
        geo.status === 'denied'
          ? 'Location access was blocked — showing live data for New Delhi. Search any city or tap the target button to try again.'
          : 'We could not get your position — showing live data for New Delhi. Search any city instead.'
      );
    }
  }, [geo.status, location]);

  // Persist the active location.
  useEffect(() => {
    if (location) saveLocation(location);
  }, [location]);

  const handleLocate = () => {
    applyGeoRef.current = true;
    geo.request();
  };

  const handlePickMap = (lat, lon) => {
    setGeoNotice(null);
    reverseGeocode(lat, lon).then((r) => {
      setLocation({
        name: [r.name, r.region, r.country].filter(Boolean).join(', ') || 'Picked on map',
        lat,
        lon,
        source: 'map',
      });
    });
  };

  // ── live data ─────────────────────────────────────────────────────────────
  const weather = useWeather(location);
  const aqi = useAQI(location);
  const { series, streak } = useLocalHistory(location, weather.data, aqi.data);
  const liveAqi = aqi.data?.current?.usAqi ?? null;
  const liveLevel = getAQILevel(liveAqi);

  // ── what-if simulation ────────────────────────────────────────────────────
  const [sim, setSim] = useState({ enabled: false, aqi: 100, temp: 25 });

  // Combined conditions fed to the advisory engine (live, or simulated).
  // Built from whichever live feeds are available — one API failing
  // (quota, network) never blanks the advisory for the other.
  const conditions = useMemo(() => {
    if (!weather.data && !aqi.data) return null;
    const w = weather.data?.current;
    const a = aqi.data?.current;
    const meta = w ? getWeatherMeta(w.weatherCode, w.isDay) : null;
    const base = {
      ready: true,
      locationName: location?.name || 'your area',
      aqi: a?.usAqi,
      pm25: a?.pm25,
      temperature: w?.temperature,
      feelsLike: w?.feelsLike,
      humidity: w?.humidity,
      wind: w?.windSpeed,
      weatherLabel: meta?.label,
      simulated: false,
      fetchedAt: Math.min(weather.data?.fetchedAt ?? Infinity, aqi.data?.fetchedAt ?? Infinity),
    };
    if (sim.enabled) {
      return {
        ...base,
        aqi: sim.aqi,
        temperature: sim.temp,
        feelsLike: sim.temp + 1,
        simulated: true,
      };
    }
    return base;
  }, [weather.data, aqi.data, location, sim]);

  // ── view state ────────────────────────────────────────────────────────────
  const [view, setView] = useState('dashboard');

  return (
    <div className="min-h-screen flex flex-col">
      <BackgroundOrbs aqi={liveAqi} />

      <Header
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onEditProfile={() => setProfilePanelOpen(true)}
        onLocate={handleLocate}
        locating={geo.status === 'prompting'}
        onSelectLocation={setLocation}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* geolocation notice */}
        <AnimatePresence>
          {geoNotice && (
            <motion.div
              key="geo-notice"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2.5 glass rounded-xl px-4 py-2.5 text-xs text-amber-300/90 border-amber-400/20"
              role="status"
            >
              <MapPinOff className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="text-muted">{geoNotice}</span>
              <button
                onClick={() => setGeoNotice(null)}
                aria-label="Dismiss notice"
                className="ml-auto w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-strong hover:bg-white/10 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* hazardous condition banner (uses LIVE values, not the simulator) */}
        <AlertBanner
          level={liveLevel}
          aqi={liveAqi}
          cityName={location?.name || 'your area'}
          profile={activeProfile}
          readingId={aqi.data?.fetchedAt}
        />

        {/* view tabs — glass segmented pill; Compare is the demo centerpiece */}
        <nav className="glass rounded-full p-1 inline-flex items-center gap-1 flex-wrap" aria-label="Main views">
          <TabButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={LayoutDashboard}>
            Dashboard
          </TabButton>
          <TabButton
            active={view === 'compare'}
            onClick={() => setView('compare')}
            icon={Split}
            highlight
          >
            Compare profiles
          </TabButton>
        </nav>

        <AnimatePresence mode="wait">
          {view === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <Dashboard
                location={location}
                weather={weather}
                aqi={aqi}
                conditions={conditions}
                series={series}
                streak={streak}
                activeProfile={activeProfile}
                activePersonaId={activePersonaId}
                onSelectPersona={(p) => setActivePersonaId(p.id)}
                onUseCustom={() => setActivePersonaId('custom')}
                customProfileName={savedProfile.name}
                sim={sim}
                onSetSim={setSim}
                onOpenCompare={() => setView('compare')}
                theme={theme}
                onPickMap={handlePickMap}
              />
            </motion.div>
          ) : (
            <motion.div
              key="compare"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {conditions ? (
                <CompareProfilesView conditions={conditions} savedProfile={savedProfile} />
              ) : (
                <div className="glass rounded-2xl p-8 text-center text-sm text-muted">
                  Waiting for live conditions…
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-2 border-t border-white/5 py-6 px-4">
        <p className="text-[11px] text-muted text-center flex flex-wrap justify-center gap-x-2 gap-y-1 leading-relaxed">
          <span>
            Live data:{' '}
            <a
              href="https://open-meteo.com"
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:text-sky-300"
            >
              Open-Meteo
            </a>{' '}
            (weather + air quality, no API key)
          </span>
          <span aria-hidden="true">•</span>
          <span>Advisory: Groq LLM with built-in smart-rules fallback</span>
          <span aria-hidden="true">•</span>
          <span>
            AQI banner tint: <span style={{ color: liveLevel.color }}>{liveLevel.label}</span>
          </span>
        </p>
      </footer>

      <ProfileForm
        open={profilePanelOpen}
        profile={savedProfile}
        onSave={handleSaveProfile}
        onClose={() => setProfilePanelOpen(false)}
      />

      {/* subtle screen-reader live region for AQI changes */}
      <span className="sr-only" role="status">
        {liveAqi !== null ? `Current air quality index ${liveAqi}, ${liveLevel.label}` : 'Loading air quality'}
      </span>
    </div>
  );
}
