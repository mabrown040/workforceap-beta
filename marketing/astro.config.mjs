import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  // Phase 1 de-risk: build the marketing site under /m and emit straight into
  // the Next app's public/ so one Vercel build serves both. Phase 1b drops the
  // base and takes over the real marketing routes.
  base: '/m',
  outDir: '../public/m',
  integrations: [react()],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr', 'pt'],
    routing: { prefixDefaultLocale: false },
  },
});
