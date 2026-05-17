import { describe, it, expect } from 'vitest';
import { getImgProps } from 'next/dist/shared/lib/get-img-props';
import defaultLoader from 'next/dist/shared/lib/image-loader';
import { imageConfigDefault } from 'next/dist/shared/lib/image-config';
import { MARKETING_FULL_BLEED_HERO_SIZES } from '@/lib/marketing/heroImage';

/** Mirrors `components/marketing/ui` Image config merging + `next.config.ts` deviceSizes cap. */
function heroTestImageConfig() {
  const deviceSizes = [384, 640, 750, 828, 1080, 1200, 1920];
  const allSizes = [...deviceSizes, ...imageConfigDefault.imageSizes].sort((a, b) => a - b);
  return {
    ...imageConfigDefault,
    deviceSizes: [...deviceSizes].sort((a, b) => a - b),
    allSizes,
    qualities: [75, 85],
    formats: ['image/avif', 'image/webp'],
  };
}

describe('marketing hero image (sizes + srcSet)', () => {
  it('advertises viewport width via sizes with a vw hint for Next', () => {
    expect(MARKETING_FULL_BLEED_HERO_SIZES).toBe('100vw');
    expect(/\d+vw/.test(MARKETING_FULL_BLEED_HERO_SIZES)).toBe(true);
  });

  it('fills srcSet with multiple optimizer widths capped by deviceSizes max', () => {
    const config = heroTestImageConfig();
    const { props } = getImgProps(
      {
        src: '/images/hero-people.webp',
        alt: '',
        fill: true,
        sizes: MARKETING_FULL_BLEED_HERO_SIZES,
        quality: 85,
        priority: true,
      },
      {
        defaultLoader,
        imgConf: config,
        blurComplete: true,
        showAltText: false,
      },
    );

    expect(props.sizes).toBe('100vw');
    const parts = String(props.srcSet ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    expect(parts.length).toBeGreaterThan(4);
    expect(parts.some((p) => /\b384w\b/.test(p))).toBe(true);
    expect(parts.some((p) => /\b1200w\b/.test(p))).toBe(true);
    expect(parts.some((p) => /\b1920w\b/.test(p))).toBe(true);
    // Next prefers the widest URL for `src` when emitting `kind: 'w'` srcSets.
    expect(String(props.src)).toMatch(/(^|[?&])w=1920(&|$)/);
  });
});
