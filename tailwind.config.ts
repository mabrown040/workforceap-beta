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
          primary: '#1a1a1a', // wa-brand-primary
          accent: '#ad2c4d', // wa-brand-accent
          'accent-dark': '#8b1f38', // wa-brand-accent-dark
          blue: '#2b7bb9', // wa-brand-blue (supporting only — never primary CTA)
          gold: '#a47f38', // wa-brand-gold
          'gold-light': '#c49a4a', // wa-brand-gold-light
          green: '#4a9b4f', // wa-brand-green
        },
      },
    },
  },
  plugins: [],
};

export default config;
