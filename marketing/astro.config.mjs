import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  // Phase 1b: Astro builds at root (clean URLs); the Vercel buildCommand copies
  // dist/* into the Next app's public/ so static marketing routes serve at root
  // while Next owns the dynamic routes. (outDir stays the default ./dist —
  // never point it at public/, Astro cleans its outDir on build.)
  integrations: [react()],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr', 'pt'],
    routing: { prefixDefaultLocale: false },
  },
  // Public /outcomes is temporarily hidden. Page source lives at
  // src/_archive/outcomes.astro — restore by moving it back to
  // src/pages/outcomes.astro and removing these redirects (+ Next redirects).
  redirects: {
    '/outcomes': '/',
    '/outcomes/': '/',
  },
});
