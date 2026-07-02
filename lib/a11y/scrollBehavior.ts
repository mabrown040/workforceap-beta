/**
 * JS-driven smooth scrolling (`element.scrollIntoView({ behavior: 'smooth' })`,
 * `window.scrollTo({ behavior: 'smooth' })`) ignores `prefers-reduced-motion`.
 * The global CSS kill switch (css/main.css, `scroll-behavior: auto !important`)
 * does not help here — the spec makes an explicit `behavior` option win over the
 * CSS `scroll-behavior` property. Use `scrollBehavior()` wherever a scroll call
 * would otherwise hardcode `'smooth'` so reduced-motion users get an instant jump.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** `'auto'` (instant) when the user prefers reduced motion, else `'smooth'`. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
