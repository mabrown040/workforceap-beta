/**
 * Shared `sizes` for full-bleed marketing heroes (`next/image` + `fill` + cover).
 *
 * The image paints at ~viewport width (`100vw`) up through large laptop/desktop widths.
 * Above 1920px CSS viewport we still cap the *stated* display width at 1920px so the
 * optimizer prefers sub-4K assets instead of hauling very large renditions when the crop
 * is soft and retina gains are negligible.
 *
 * Must stay consistent with vw tokens used elsewhere so Next.js can derive srcSet widths
 * (`get-img-props` scans for `NNvw`).
 */
export const MARKETING_FULL_BLEED_HERO_SIZES = '(max-width: 1920px) 100vw, 1920px';
