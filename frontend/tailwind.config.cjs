/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        gb: {
          bg: '#93C63A',
          bgDark: '#7FAE2E',
          frame: '#2E3238',
          panel: '#C7C7C7',
          border: '#111111',
          text: '#111111',
          progress: '#4E6E17',
          accentOrange: '#E98A2E',
          accentCoral: '#E68D86',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['"Press Start 2P"', '"VT323"', 'monospace'],
      },
      boxShadow: {
        gbInner: 'inset 0 0 0 2px rgba(17, 17, 17, 0.2)',
        gbFrame: '0 10px 25px rgba(17, 17, 17, 0.28)',
      },
      maxWidth: {
        'gb-screen': '72rem',
      },
    },
  },
  plugins: [],
};
