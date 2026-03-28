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
          primary: '#1a1a1a',           // wa-brand-primary — near-black body text
          accent: '#ad2c4d',            // wa-brand-accent — crimson CTA (light mode)
          'accent-deep': '#8c0f37',     // wa-brand-accent-deep — crimson gradient start / dark mode CTA bg
          'accent-dark': '#8b1f38',     // wa-brand-accent-dark — hover state
          blue: '#2b7bb9',              // wa-brand-blue — supporting info only
          gold: '#a47f38',              // wa-brand-gold — achievements / milestones
          'gold-light': '#c49a4a',      // wa-brand-gold-light — gold hover
          green: '#4a9b4f',             // wa-brand-green — success / placement
        },
        // Editorial Catalyst surface palette (light)
        surface: {
          DEFAULT: '#fcf9f8',           // wa-surface — warm off-white body bg
          variant: '#e5e2e1',           // wa-surface-variant — muted container
          outline: '#8b7073',           // wa-surface-outline — muted border
        },
        // Editorial Catalyst dark mode tokens
        dark: {
          bg: '#141313',                // wa-dark-bg
          surface: '#201f1f',           // wa-dark-surface
          'surface-low': '#1c1b1b',     // wa-dark-surface-low
          'surface-high': '#2b2a2a',    // wa-dark-surface-high
          'surface-bright': '#3a3939',  // wa-dark-surface-bright
          text: '#e6e1e1',              // wa-dark-text — primary text
          muted: '#debfc2',             // wa-dark-muted — secondary text
          primary: '#ffb2bc',           // wa-dark-primary — CTA in dark mode
          'on-primary': '#670024',      // wa-dark-on-primary — text on dark CTA
          outline: '#a68a8d',           // wa-dark-outline
        },
      },
      fontFamily: {
        headline: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        label: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',  // 4px
        lg: '0.5rem',        // 8px
        xl: '0.75rem',       // 12px
        '2xl': '1rem',       // 16px
        full: '9999px',      // pill
      },
      boxShadow: {
        sm: '0 1px 3px rgba(28,27,27,0.06), 0 1px 2px rgba(28,27,27,0.04)',
        md: '0 4px 16px rgba(28,27,27,0.07), 0 2px 4px rgba(28,27,27,0.05)',
        lg: '0 10px 40px rgba(28,27,27,0.1), 0 4px 12px rgba(28,27,27,0.06)',
        xl: '0 20px 60px rgba(28,27,27,0.14), 0 8px 20px rgba(28,27,27,0.08)',
        'glow-accent': '0 0 30px rgba(140,15,55,0.2), 0 0 60px rgba(140,15,55,0.08)',
        'glow-gold': '0 0 30px rgba(164,127,56,0.2), 0 0 60px rgba(164,127,56,0.08)',
        card: '0 20px 40px rgba(28,27,27,0.06)',
      },
      backdropBlur: {
        nav: '12px',
      },
    },
  },
  plugins: [],
};

export default config;
