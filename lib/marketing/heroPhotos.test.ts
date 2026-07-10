import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  MARKETING_HERO_PHOTO_POOL,
  heroPhotoForKey,
  heroPhotoSequenceForKey,
} from './heroPhotos';

const layoutAstro = readFileSync(
  resolve(process.cwd(), 'marketing/src/layouts/Layout.astro'),
  'utf8',
);

test('marketing Layout sets per-page hero photo on <html> (not is:global placeholder)', () => {
  assert.match(
    layoutAstro,
    /style=\{`--wap-hero-photo-url: \$\{heroPhotoUrl\}; --wap-hero-photo-url-2: \$\{heroPhotoUrl2\}; --wap-hero-photo-url-3: \$\{heroPhotoUrl3\}`\}/,
  );
  assert.doesNotMatch(layoutAstro, /url\('\{heroPhotoPath\}'\)/);
});

test('heroPhotoForKey returns stable photo per route', () => {
  const a = heroPhotoForKey('/programs');
  const b = heroPhotoForKey('/programs');
  assert.equal(a, b);
});

test('heroPhotoForKey varies across different routes', () => {
  const photos = new Set(
    ['/programs', '/employers', '/faq', '/contact', '/how-it-works', '/partners'].map(heroPhotoForKey),
  );
  assert.ok(photos.size >= 3, 'expected multiple distinct hero photos across routes');
});

test('heroPhotoSequenceForKey gives each section a distinct photo', () => {
  for (const key of ['/', '/programs', '/employers', '/faq', '/contact', '/how-it-works']) {
    const seq = heroPhotoSequenceForKey(key, 3);
    assert.equal(seq.length, 3);
    assert.equal(new Set(seq).size, 3, `expected 3 distinct photos for ${key}`);
    assert.equal(seq[0], heroPhotoForKey(key), 'first entry must stay the stable hero pick');
  }
});

test('hero photo pool excludes skyline and near-duplicate assets', () => {
  const banned = [
    'austin-skyline',
    'image-asset',
    // Austin skyline behind a stock filename (stakeholder: people photos only)
    'AdobeStock_78118914',
    // wood-cabin shoot near-duplicates of hero-people.webp
    '1521737604893',
    '1521737711867',
    '1522071820081',
  ];
  for (const path of MARKETING_HERO_PHOTO_POOL) {
    for (const fragment of banned) {
      assert.ok(!path.includes(fragment), `${path} should not be in the hero pool`);
    }
  }
  assert.equal(new Set(MARKETING_HERO_PHOTO_POOL).size, MARKETING_HERO_PHOTO_POOL.length);
});
