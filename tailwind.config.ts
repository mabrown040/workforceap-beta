import type { Config } from 'tailwindcss';

const config: Config = {
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
        brand: {
          primary: '#1a1a1a',     // near-black — matches --color-primary in main.css
          blue: '#2b7bb9',        // supporting blue — matches --color-blue in main.css
          accent: '#ad2c4d',      // crimson — primary accent/CTA
          'accent-dark': '#8b1f38',
          gold: '#a47f38',
          'gold-light': '#c49a4a',
          green: '#4a9b4f',
        },
      },
    },
  },
  plugins: [],
};

export default config;
