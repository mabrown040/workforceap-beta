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
          blue: '#2b7bb9',
          gold: '#a47f38',
          'gold-light': '#c49a4a',
          green: '#4a9b4f',
        },
        // M3 dark-mode tokens from Stitch designs
        m3: {
          primary: '#ffb2bc',
          'primary-container': '#ad2c4d',
          'primary-dark': '#8c0f37',
          'on-primary': '#670024',
          'on-primary-container': '#ffcbd1',
          secondary: '#ffb2bc',
          'secondary-container': '#71333e',
          'on-secondary': '#551d29',
          surface: '#141313',
          'surface-dim': '#141313',
          'surface-bright': '#3a3939',
          'surface-container-lowest': '#0f0e0e',
          'surface-container-low': '#1c1b1b',
          'surface-container': '#201f1f',
          'surface-container-high': '#2b2a2a',
          'surface-container-highest': '#363434',
          'on-surface': '#e6e1e1',
          'on-surface-variant': '#debfc2',
          outline: '#a68a8d',
          'outline-variant': '#584144',
          error: '#ffb4ab',
          'error-container': '#93000a',
          background: '#141313',
          'on-background': '#e6e1e1',
          'inverse-surface': '#e6e1e1',
          'inverse-primary': '#ad2c4d',
        },
      },
    },
  },
  plugins: [],
};

export default config;
