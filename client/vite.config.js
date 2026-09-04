import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ─────────────────────────────────────────────────────────────────────────────
// AirSense client (Vite)
//  • Dev server on port 3000 (strictPort — it never silently moves)
//  • /api/* is proxied to the Express server (default http://localhost:3001),
//    so the browser only ever talks to this origin — no CORS in local dev.
//  • allowedHosts is needed when the dev server sits behind a reverse proxy
//    or tunnel (sandbox previews, ngrok, shared demos). Harmless locally.
// ─────────────────────────────────────────────────────────────────────────────

const API_TARGET = process.env.VITE_DEV_API_TARGET || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
