/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ndamba palette (October 2026): chalk lines on a Cameroonian pitch, the gold of the star, kola red for alerts.
        cream: '#F6F7F2',      // chalk: the app background
        paper: '#FFFFFF',      // cards and panels
        sand: '#ECEFE8',       // mist: quiet fills
        line: '#DCE2D8',       // hairlines
        ink: { DEFAULT: '#12211A', soft: '#34443B', muted: '#5D6C63', faint: '#94A198' },
        forest: { 50: '#E8F3ED', 100: '#CBE5D6', 300: '#73B391', 500: '#13804F', 600: '#0B5D3B', 700: '#084B30', 800: '#063A25', 900: '#042A1B' },
        terra: { 50: '#FBEDE6', 100: '#F2D0BF', 300: '#DB8D66', 500: '#BF5A2E', 600: '#A04A24', 700: '#7D391B' },
        sun: { 50: '#FFF8DD', 100: '#FFEAA6', 300: '#FFD452', 500: '#F5B700', 600: '#D29C00', 700: '#9A7300' },
        clay: { 50: '#FCE9EC', 100: '#F6C4CC', 300: '#E8798A', 500: '#D7263D', 600: '#B51D31', 700: '#8E1626' },
        night: { 700: '#0E2A1E', 800: '#0A2117', 900: '#061710' },
        ok: { 50: '#E6F2EA', 500: '#2E7D4F' },
      },
      fontFamily: {
        display: ['"Archivo Variable"', 'Archivo', 'system-ui', 'sans-serif'],
        sans: ['"Archivo Variable"', 'Archivo', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(18,33,26,.04)',
        lift: '0 18px 40px -18px rgba(6,58,37,.35)',
      },
    },
  },
  plugins: [],
}
