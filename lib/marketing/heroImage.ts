/**
 * Shared `sizes` for full-bleed marketing heroes (`next/image` + `fill` + cover).
 *
 * Below ultra-wide breakpoints the slot is the viewport (`100vw`), so mobile (e.g. 375px)
 * pairs with DPR when choosing from `srcSet` (typically ≈750w @2x, ≈1200w @3x — not 1920).
 * From `(min-width: 1921px)` the art is still full-bleed but never wider than 1920px in
 * layout terms, matching `images.deviceSizes` max and avoiding over-large slot hints.
 *
 * Include a literal `vw` token so Next derives multiple optimizer widths (`get-img-props`
 * parses `NNvw` for `srcSet` generation).
 *
 * Note: Next sets `<img src>` to the widest `srcSet` candidate for legacy fallbacks and
 * Safari ordering — the **selected** download follows `sizes` + `srcSet` (see Network
 * “currentSrc”, not only the `src` URL).
 */
export const MARKETING_FULL_BLEED_HERO_SIZES =
  '(min-width: 1921px) 1920px, 100vw';
