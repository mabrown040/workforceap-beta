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
          primary: '#1e40af',
          accent: '#ad2c4d',
          gold: '#a47f38',
        },
      },
    },
  },
  plugins: [],
};

export default config;
