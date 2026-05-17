/**
 * Shared `sizes` for full-bleed marketing heroes (`next/image` + `fill` + cover).
 *
 * The photo spans the viewport, so browsers should interpret the layout width as ~100vw
 * and pair that with devicePixelRatio when choosing from `srcSet`. Use a literal `vw`
 * token here so Next derives multiple optimizer widths (`get-img-props` parses `NNvw`).
 *
 * The largest rendition is still capped by `images.deviceSizes` in `next.config.ts`
 * (currently 1920). Note: Next sets `<img src>` to the widest candidate for legacy
 * fallbacks—actual bytes should follow `sizes` + `srcSet`; verify in Network, not only `src`.
 */
export const MARKETING_FULL_BLEED_HERO_SIZES = '100vw';
