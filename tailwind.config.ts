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

        // M3 Light mode tokens — wa-bg-m3-surface, wa-text-m3-on-surface, etc.
        m3: {
          surface: '#fcf9f8',
          'surface-dim': '#dcd9d9',
          'surface-container': '#f0edec',
          'surface-container-low': '#f6f3f2',
          'surface-container-high': '#ebe7e7',
          'surface-container-highest': '#e5e2e1',
          'surface-container-lowest': '#ffffff',
          'on-surface': '#1c1b1b',
          'on-surface-variant': '#584144',
          primary: '#8c0f37',
          'primary-container': '#ad2c4d',
          'on-primary': '#ffffff',
          'on-primary-container': '#ffcbd1',
          'primary-fixed': '#ffd9dd',
          'primary-fixed-dim': '#ffb2bc',
          outline: '#8b7073',
          'outline-variant': '#debfc2',
          tertiary: '#643f00',
          'tertiary-container': '#82550a',
          'tertiary-fixed': '#ffddb5',
          'tertiary-fixed-dim': '#f8bb6b',
          'on-tertiary-fixed': '#2a1800',
          error: '#ba1a1a',
          'error-container': '#ffdad6',
          'on-error-container': '#93000a',
          secondary: '#5f5e5e',
          'secondary-container': '#e5e2e1',
          'inverse-surface': '#313030',
        },

        // M3 Dark mode tokens — wa-bg-m3d-surface, wa-text-m3d-on-surface, etc.
        m3d: {
          surface: '#141313',
          'surface-dim': '#141313',
          'surface-bright': '#3a3939',
          'surface-container': '#201f1f',
          'surface-container-low': '#1c1b1b',
          'surface-container-high': '#2b2a2a',
          'surface-container-highest': '#363434',
          'surface-container-lowest': '#0f0e0e',
          'on-surface': '#e6e1e1',
          'on-surface-variant': '#debfc2',
          primary: '#ffb2bc',
          'primary-container': '#ad2c4d',
          'on-primary': '#670024',
          'on-primary-container': '#ffcbd1',
          outline: '#a68a8d',
          'outline-variant': '#584144',
          tertiary: '#80d99f',
          'tertiary-container': '#006d3e',
          'tertiary-fixed': '#9cf6ba',
          'tertiary-fixed-dim': '#80d99f',
          'on-tertiary-container': '#92ecb1',
          'on-tertiary-fixed': '#00210f',
          error: '#ffb4ab',
          'error-container': '#93000a',
          secondary: '#ffb2bc',
          'secondary-container': '#71333e',
          'on-secondary': '#551d29',
          'inverse-surface': '#e6e1e1',
          'inverse-primary': '#ad2c4d',
        },
      },
    },
  },
  plugins: [],
};

export default config;
