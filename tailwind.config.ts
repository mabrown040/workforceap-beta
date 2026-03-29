import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  prefix: 'wa-',
  corePlugins: {
    preflight: false,
  },
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Prefixed classes: wa-brand-* — keep in sync with DESIGN.md + css/main.css
        brand: {
          primary: '#1a1a1a',
          accent: '#ad2c4d',
          'accent-dark': '#8b1f38',
          'accent-light': '#ffb2bc',
          blue: '#2b7bb9',
          gold: '#FFBB00',
          'gold-light': '#ffd54f',
          green: '#4a9b4f',
        },
        // Stitch surface-container tonal scale
        surface: {
          DEFAULT: '#121416',
          'container-lowest': '#0c0e10',
          'container-low': '#1a1c1e',
          container: '#1e2022',
          'container-high': '#282a2c',
          'container-highest': '#333537',
          dim: '#121416',
          bright: '#383a3c',
        },
        'on-surface': {
          DEFAULT: '#e2e2e5',
          variant: '#debfc2',
        },
        'outline-variant': '#584144',
      },
      backdropBlur: {
        glass: '12px',
        'glass-xl': '20px',
      },
    },
  },
  plugins: [],
};

export default config;
