import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MARKETING_HERO_PHOTO_POOL,
  heroPhotoForKey,
} from './heroPhotos';

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
