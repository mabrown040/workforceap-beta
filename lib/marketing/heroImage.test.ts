import test from 'node:test';
import assert from 'node:assert/strict';
import { MARKETING_FULL_BLEED_HERO_SIZES } from './heroImage';

/**
 * Mirrors `images.deviceSizes` in `next.config.ts` (omit this test's array drifting from config).
 */
const DEVICE_SIZES = [384, 640, 750, 828, 1080, 1200, 1920];

function widthsFromSizesMatchingNext(sizes: string): number[] {
  const viewportWidthRe = /(^|\s)(1?\d?\d)vw/g;
  const percentSizes: number[] = [];
  for (let m = viewportWidthRe.exec(sizes); m; m = viewportWidthRe.exec(sizes)) {
    percentSizes.push(parseInt(m[2], 10));
  }
  assert.ok(
    percentSizes.length > 0,
    `${sizes} must include at least one NNvw fragment for responsive src widths`,
  );
  const smallestRatio = Math.min(...percentSizes) * 0.01;
  const allSizes = [
    ...new Set([...DEVICE_SIZES, 16, 32, 48, 64, 96, 128, 256, 384]),
  ].sort((a, b) => a - b);
  return allSizes.filter((s) => s >= DEVICE_SIZES[0] * smallestRatio);
}

test('MARKETING_FULL_BLEED_HERO_SIZES: mobile viewports resolve to ~100vw (allows small src widths)', () => {
  assert.match(MARKETING_FULL_BLEED_HERO_SIZES, /100vw/);
  const widths = widthsFromSizesMatchingNext(MARKETING_FULL_BLEED_HERO_SIZES);
  assert.ok(widths.includes(750), `expected 750w in derived widths; got ${widths.join(', ')}`);
  assert.ok(widths.includes(1920), `expected 1920w ceiling in derived widths; got ${widths.join(', ')}`);
  assert.equal(widths[widths.length - 1], 1920, 'deviceSizes ceiling should stay at 1920 for hero src/srcSet');
});
