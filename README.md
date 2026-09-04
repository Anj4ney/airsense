# AirSense — Personalized Weather & AQI Health Advisory

> **The problem:** generic weather/AQI alerts apply one threshold to everyone. An asthma patient, an outdoor worker, and a healthy adult all get the same warning. AirSense gives each of them a *different*, AI-generated, plain-English advisory — from the **same live air**.

- **Live data, zero fake results** — weather + US AQI from [Open-Meteo](https://open-meteo.com) (free, no API key, no signup)
- **Personalized advisory** — Groq LLM (free tier) with a rule-based fallback engine so **the demo never breaks, even with zero API keys**
- **Judge-ready** — persona quick-select, side-by-side profile comparison, what-if simulator, read-aloud, shareable advisory cards

---

## ⚡ Judge Quick Demo (under 90 seconds)

1. **Click a persona card** (🫁 Asthma Patient / 🏃 Outdoor Athlete / 👶 Parent of Toddler) — watch the advisory rewrite itself instantly. Same air, different advice.
2. **Hit the “Compare profiles” tab** — two advisories side-by-side for the *exact same live readings*. Only the person changes. This is the core value prop.
3. **Drag the What-if AQI slider up to ~180** — the advisory escalates in real time. Proof the reasoning is dynamic, not cached or scripted (drag further to see the banner-worthy tiers).

No setup, no keys needed for any of the above — everything you see is live data.

---

## 🚀 Run locally (one command)

```bash
npm install && npm run dev
```

That's it. The root `postinstall` installs the client and server dependencies, and `npm run dev` starts both via `concurrently`:

| Service | URL | Notes |
|---|---|---|
| Web (Vite) | http://localhost:3000 | the app |
| API (Express) | http://localhost:3001 | `/api/health`, `/api/advisory` |

> Requires Node 18+ (uses global `fetch` and `node --watch`).

### Optional: enable the LLM advisory (2 minutes, free)

The app is fully functional without any key (smart-rules engine). To upgrade the advisory to LLM-generated:

```bash
cd server
cp .env.example .env
# then edit .env and paste your GROQ_API_KEY
```

**Get a free Groq key:** sign up at <https://console.groq.com> → *API Keys* → *Create API Key*. No credit card. Paste it into `server/.env`. Restart `npm run dev`. The advisory badge flips from **Smart rules** to **AI · Groq**.

---

## 🧠 How it works

```
 Browser (React + Vite)
 ├── Open-Meteo Forecast API ......... live weather + 7-day history     (no key)
 ├── Open-Meteo Air Quality API ..... live US AQI + PM2.5/PM10/O3/NO2  (no key)
 ├── Open-Meteo Geocoding ........... city search autocomplete          (no key)
 ├── BigDataCloud reverse geocode ... place names for map taps / GPS    (no key)
 ├── localStorage ................... profile + 7-day history + theme   (swappable data layer)
 └── /api/advisory (Express, :3001) .. the ONLY backend call — proxies Groq
                                      so the LLM key never reaches the browser
```

**Failure policy:** if `GROQ_API_KEY` is missing, the LLM errors, or the network dies, the client transparently falls back to `client/src/lib/ruleBasedFallback.js` — a decision-tree engine that produces genuinely profile-specific advisories. Weather + AQI stay live either way.

**AQI theme:** one constants file, `client/src/lib/aqiTheme.js`, drives every color in the app — hero badge, alert banner, chart dots, map pin, share card, slider accents. Simplified 5-tier scale (Good/Moderate/Unhealthy/Very Unhealthy/Hazardous) derived from US EPA breakpoints; the alert banner triggers from AQI 101 (Unhealthy) up.

---

## ✨ Feature checklist

- City search (autocomplete) + “Use my location” geolocation + tap-anywhere-on-map
- Live temperature, humidity, wind, AQI — color-coded by severity, auto-refresh every 5 min with a “last updated Xs ago” ticker
- Health profile (age group, multi-select conditions, occupation) — localStorage, editable via slide-in panel
- AI advisory that visibly differs across profiles for identical conditions
- 7-day AQI + temperature trend chart (recharts) with hover tooltips, real past data cached in localStorage
- Animated hazardous-condition banner — dismissible, reappears on the next hazardous reading
- Quick-select demo personas (one click = instant advisory rewrite)
- **Compare Profiles split view** (the centerpiece)
- What-if simulator (AQI + temperature sliders → live advisory regeneration)
- Read-aloud via the browser SpeechSynthesis API
- Gamified air-quality streak badge (from stored history)
- Shareable advisory card (PNG export via html-to-image + text copy)
- Dark mode by default with a light toggle, glassmorphism UI, skeleton loaders, friendly error states, 375px-safe responsive layout

---

## ☁️ Deployment

### Option A — two free services (recommended)

**API → Render (or Railway):**
- New Web Service → root directory: `server`
- Build: `npm install` · Start: `npm start` · env: `GROQ_API_KEY` (+ optional `GROQ_MODEL`, `PORT`)
- Note the URL, e.g. `https://airsense-api.onrender.com`

**Web → Vercel (or Netlify):**
- Root directory: `client`, framework: Vite (build `npm run build`, output `dist`)
- Environment variable **set before building** (Vite inlines it): `VITE_API_URL=https://airsense-api.onrender.com`

### Option B — single service

```bash
npm run build          # builds client/dist
cd server && npm start # Express serves the built client + API from one origin
```
Deploy that one service (Render/Railway) with `GROQ_API_KEY` — done.

---

## 📁 Project structure

```
airsense/
├── package.json                 # root: concurrently runs client + server
├── client/
│   ├── index.html / vite.config.js / tailwind.config.js / postcss.config.js
│   └── src/
│       ├── components/          # Dashboard, AdvisoryCard, CompareProfilesView,
│       │                        # MapView, TrendChart, WhatIfSimulator, AlertBanner,
│       │                        # PersonaQuickSelect, ProfileForm, ShareCard,
│       │                        # ReadAloudButton, StreakBadge, SkeletonLoader, …
│       ├── hooks/               # useWeather, useAQI, useAdvisory,
│       │                        # useLocalHistory, useGeolocation
│       └── lib/                 # api.js (Open-Meteo), llm.js (prompt + Groq),
│                                # ruleBasedFallback.js, aqiTheme.js, personas.js,
│                                # weatherCodes.js, storage.js
└── server/
    ├── index.js                 # Express: health, advisory proxy, static hosting
    ├── routes/advisory.js       # Groq call + rate limit + fallback markers
    └── .env.example             # GROQ_API_KEY (free, optional)
```

---

## 🛠 Troubleshooting

- **Port 3000/3001 busy** — set `PORT` for the server; Vite is strict on 3000 by design (change in `vite.config.js`).
- **Geolocation denied** — the app falls back to live New Delhi data with a friendly notice; search or the map work regardless.
- **“Smart rules” badge instead of “AI · Groq”** — no key configured or Groq errored; check `server/.env` and the terminal.
- **Advisory seems slow on first load** — the Express server cold-starts in ~1s; the rule-based path is instant.

## 📊 Data & credits

All environmental data: [Open-Meteo](https://open-meteo.com) (Forecast, Air Quality, Geocoding APIs — CC-BY 4.0, free, no key). Reverse geocoding: BigDataCloud free client endpoint. Map tiles: [OpenStreetMap](https://www.openstreetmap.org/copyright) (dark mode recolors them via CSS filter — no API-key basemaps anywhere). LLM: Groq free tier. Everything else runs in your browser.
