/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // dark is the default — <html class="dark">, toggle removes it
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        /* "Planet.ai" mission-control palette (see src/index.css header) */
        void: '#0a0e17', // page background
        ink: '#10141f', // raised panel surface
        accent: {
          DEFAULT: '#6c8cff', // the single soft blue/violet accent
          soft: '#a9baff',
        },
        up: '#22c55e', // positive deltas / good trends
        down: '#ef4444', // negative deltas / warnings
        navy: {
          950: '#060a14',
          900: '#0b1220',
          800: '#111a2e',
          700: '#1b2740',
          600: '#273757',
        },
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(46px, -34px) scale(1.08)' },
          '66%': { transform: 'translate(-34px, 24px) scale(0.94)' },
        },
        'pin-pulse': {
          '0%': { transform: 'scale(0.7)', opacity: '0.7' },
          '100%': { transform: 'scale(1.45)', opacity: '0' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        eq: {
          '0%, 100%': { height: '4px' },
          '50%': { height: '14px' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        drift: 'drift 20s ease-in-out infinite',
        'pin-pulse': 'pin-pulse 2s ease-out infinite',
        shimmer: 'shimmer 1.6s infinite',
        eq: 'eq 0.9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
