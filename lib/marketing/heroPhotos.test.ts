import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  MARKETING_HERO_PHOTO_POOL,
  heroPhotoForKey,
} from './heroPhotos';

const layoutAstro = readFileSync(
  resolve(process.cwd(), 'marketing/src/layouts/Layout.astro'),
  'utf8',
);

test('marketing Layout sets per-page hero photo on <html> (not is:global placeholder)', () => {
  assert.match(layoutAstro, /style=\{`--wap-hero-photo-url: \$\{heroPhotoUrl\}`\}/);
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

test('hero photo pool excludes Austin skyline assets', () => {
  for (const path of MARKETING_HERO_PHOTO_POOL) {
    assert.ok(!path.includes('austin-skyline'), path);
    assert.ok(!path.includes('image-asset'), path);
  }
});
