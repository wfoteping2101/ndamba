/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FBF7EE',
        paper: '#FFFDF8',
        sand: '#F1EADB',
        line: '#E6DDCB',
        ink: { DEFAULT: '#1D2621', soft: '#38423C', muted: '#66706A', faint: '#9AA39D' },
        forest: { 50: '#E8F1EC', 100: '#CDE2D5', 300: '#7FAE93', 500: '#2F6B52', 600: '#1F4D3A', 700: '#173B2C', 800: '#11301F', 900: '#0B2116' },
        terra: { 50: '#FBEFE2', 100: '#F3D9BC', 300: '#E0A56B', 500: '#C5762F', 600: '#A86020', 700: '#844A17' },
        sun: { 50: '#FDF6E3', 100: '#F9E7B5', 300: '#F0C760', 500: '#E3A92B', 600: '#C08A15', 700: '#8F660C' },
        clay: { 50: '#FBEAE6', 100: '#F2C9C0', 300: '#D9806F', 500: '#B8432F', 600: '#9A3524', 700: '#7A291B' },
        night: { 700: '#16201B', 800: '#101814', 900: '#0A100D' },
        ok: { 50: '#E6F2EA', 500: '#2E7D4F' },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(29,38,33,.04), 0 4px 18px rgba(29,38,33,.06)',
        lift: '0 10px 34px rgba(29,38,33,.12)',
      },
    },
  },
  plugins: [],
}
