import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isLocaleableMarketingPath,
  isLocaleBypassPath,
  splitLocalePrefix,
  withLocalePrefix,
  pickLocaleFromAcceptLanguage,
} from './config';

// isLocaleableMarketingPath

// Pure-content marketing leaf routes (/, /programs, /programs/[slug], …) are now
// served by the static Astro marketing site at root and are intentionally NOT
// locale-redirected by the Next middleware (see LOCALEABLE_PATH_PREFIXES note in
// config.ts). They resolve to false; only Next-owned routes like /apply stay true.
test('isLocaleableMarketingPath: / returns false (Astro-served)', () => {
  assert.equal(isLocaleableMarketingPath('/'), false);
});

test('isLocaleableMarketingPath: /programs returns false (Astro-served)', () => {
  assert.equal(isLocaleableMarketingPath('/programs'), false);
});

test('isLocaleableMarketingPath: /programs/data-analytics returns false (Astro-served)', () => {
  assert.equal(isLocaleableMarketingPath('/programs/data-analytics'), false);
});

test('isLocaleableMarketingPath: /apply returns true', () => {
  assert.equal(isLocaleableMarketingPath('/apply'), true);
});

test('isLocaleableMarketingPath: /dashboard returns false', () => {
  assert.equal(isLocaleableMarketingPath('/dashboard'), false);
});

test('isLocaleableMarketingPath: /api/health returns false', () => {
  assert.equal(isLocaleableMarketingPath('/api/health'), false);
});

test('isLocaleableMarketingPath: /dashboard/training returns false', () => {
  assert.equal(isLocaleableMarketingPath('/dashboard/training'), false);
});

// isLocaleBypassPath

test('isLocaleBypassPath: /api/anything returns true', () => {
  assert.equal(isLocaleBypassPath('/api/anything'), true);
});

test('isLocaleBypassPath: /_next/static/chunk.js returns true', () => {
  assert.equal(isLocaleBypassPath('/_next/static/chunk.js'), true);
});

test('isLocaleBypassPath: /ingest/metrics returns true', () => {
  assert.equal(isLocaleBypassPath('/ingest/metrics'), true);
});

test('isLocaleBypassPath: /programs returns false', () => {
  assert.equal(isLocaleBypassPath('/programs'), false);
});

test('isLocaleBypassPath: /robots.txt returns true', () => {
  assert.equal(isLocaleBypassPath('/robots.txt'), true);
});

// splitLocalePrefix

test('splitLocalePrefix: /en/programs extracts locale and path', () => {
  assert.deepEqual(splitLocalePrefix('/en/programs'), {
    locale: 'en',
    pathnameWithoutLocale: '/programs',
  });
});

test('splitLocalePrefix: /es/apply extracts locale and path', () => {
  assert.deepEqual(splitLocalePrefix('/es/apply'), {
    locale: 'es',
    pathnameWithoutLocale: '/apply',
  });
});

test('splitLocalePrefix: /programs has no locale prefix', () => {
  assert.deepEqual(splitLocalePrefix('/programs'), {
    locale: null,
    pathnameWithoutLocale: '/programs',
  });
});

test('splitLocalePrefix: /zh/programs treats zh as unsupported locale', () => {
  assert.deepEqual(splitLocalePrefix('/zh/programs'), {
    locale: null,
    pathnameWithoutLocale: '/zh/programs',
  });
});

test('splitLocalePrefix: /en returns locale with root pathname', () => {
  assert.deepEqual(splitLocalePrefix('/en'), {
    locale: 'en',
    pathnameWithoutLocale: '/',
  });
});

// withLocalePrefix

test('withLocalePrefix: /programs with en returns /en/programs', () => {
  assert.equal(withLocalePrefix('/programs', 'en'), '/en/programs');
});

test('withLocalePrefix: / with es returns /es', () => {
  assert.equal(withLocalePrefix('/', 'es'), '/es');
});

// pickLocaleFromAcceptLanguage

test('pickLocaleFromAcceptLanguage: picks es from complex accept-language header', () => {
  assert.equal(pickLocaleFromAcceptLanguage('es-MX,es;q=0.9,en;q=0.8'), 'es');
});

test('pickLocaleFromAcceptLanguage: picks fr from fr-FR header', () => {
  assert.equal(pickLocaleFromAcceptLanguage('fr-FR,fr;q=0.9'), 'fr');
});

test('pickLocaleFromAcceptLanguage: falls back to en for unsupported zh-CN', () => {
  assert.equal(pickLocaleFromAcceptLanguage('zh-CN'), 'en');
});

test('pickLocaleFromAcceptLanguage: returns en for null header', () => {
  assert.equal(pickLocaleFromAcceptLanguage(null), 'en');
});
