'use client';

import { useEffect, useState } from 'react';

const MOBILE_MQ = '(max-width: 768px)';
const DEFAULT_HERO_SELECTOR = '.apply-hero, .paid-apply-hero';
const FALLBACK_SCROLL_THRESHOLD = 400;

// Safe, static fallbacks used if computed rootMargin values are non-finite
// or if the browser rejects the computed rootMargin string outright.
const FALLBACK_FORM_ROOT_MARGIN = '-72px 0px -80px 0px';
const FALLBACK_HERO_ROOT_MARGIN = '-72px 0px 0px 0px';

/**
 * Ensures a computed pixel value is finite before it is interpolated into an
 * IntersectionObserver rootMargin string. IntersectionObserver throws a
 * SyntaxError if rootMargin contains non-finite values (e.g. NaN/Infinity),
 * which can happen if getComputedStyle/env() lookups fail in some browsers.
 * Falls back to `fallback` (already an integer pixel value) when invalid,
 * and always rounds to an integer pixel value otherwise.
 */
function toFinitePx(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

function getSafeAreaInsetBottomPx(): number {
  if (typeof window === 'undefined') return 0;
  const div = document.createElement('div');
  div.style.paddingBottom = 'env(safe-area-inset-bottom)';
  div.style.position = 'fixed';
  div.style.visibility = 'hidden';
  document.body.appendChild(div);
  const value = parseFloat(getComputedStyle(div).paddingBottom) || 0;
  document.body.removeChild(div);
  return value;
}

function getRemPx(): number {
  if (typeof window === 'undefined') return 16;
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

/**
 * Shows a mobile sticky CTA after the apply hero leaves the viewport, but hides it
 * when the apply form region is in view so it does not cover submit buttons.
 * @param hideWhenSelector CSS selector(s) for the form card/region (comma-separated for multiple).
 */
export function useApplyStickyCtaVisibility(
  hideWhenSelector: string,
  heroSelector = DEFAULT_HERO_SELECTOR,
) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const formTargets = document.querySelectorAll(hideWhenSelector);
    const hero = document.querySelector(heroSelector);
    let heroPast = false;
    const formIntersectingByTarget = new Map<Element, boolean>();

    const recompute = () => {
      const formIntersecting =
        formIntersectingByTarget.size === 0 ||
        [...formIntersectingByTarget.values()].some(Boolean);
      setVisible(mq.matches && heroPast && !formIntersecting);
    };

    // Compute rootMargin dynamically — IntersectionObserver does not accept
    // CSS env() in rootMargin; must be pixels or percent.
    const remPxRaw = getRemPx();
    const safeAreaBottomRaw = getSafeAreaInsetBottomPx();
    const remPx = toFinitePx(remPxRaw, 16);
    const safeAreaBottom = toFinitePx(safeAreaBottomRaw, 0);
    const bottomMargin = toFinitePx(-(4.5 * remPx + safeAreaBottom), -80);
    const formRootMargin = `-72px 0px ${bottomMargin}px 0px`;

    const formObservers: IntersectionObserver[] = [];
    formTargets.forEach((formTarget) => {
      const handleFormEntry: IntersectionObserverCallback = ([entry]) => {
        formIntersectingByTarget.set(formTarget, entry.isIntersecting);
        recompute();
      };

      let observer: IntersectionObserver | undefined;
      try {
        observer = new IntersectionObserver(handleFormEntry, {
          rootMargin: formRootMargin,
          threshold: 0.05,
        });
      } catch {
        try {
          observer = new IntersectionObserver(handleFormEntry, {
            rootMargin: FALLBACK_FORM_ROOT_MARGIN,
            threshold: 0.05,
          });
        } catch {
          // Give up gracefully: sticky CTA simply won't auto-hide for this
          // target, but the apply flow must not crash.
          observer = undefined;
        }
      }

      if (observer) {
        observer.observe(formTarget);
        formObservers.push(observer);
      }
    });

    let heroObserver: IntersectionObserver | undefined;
    if (hero) {
      const handleHeroEntry: IntersectionObserverCallback = ([entry]) => {
        heroPast = !entry.isIntersecting;
        recompute();
      };

      try {
        heroObserver = new IntersectionObserver(handleHeroEntry, {
          rootMargin: FALLBACK_HERO_ROOT_MARGIN,
          threshold: 0,
        });
        heroObserver.observe(hero);
      } catch {
        // Give up gracefully: sticky CTA simply won't auto-hide, but the
        // apply flow must not crash.
        heroObserver = undefined;
      }
    }

    const onScroll = () => {
      if (!hero) {
        heroPast = window.scrollY > FALLBACK_SCROLL_THRESHOLD;
        recompute();
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    mq.addEventListener('change', onScroll);

    return () => {
      formObservers.forEach((observer) => observer.disconnect());
      heroObserver?.disconnect();
      window.removeEventListener('scroll', onScroll);
      mq.removeEventListener('change', onScroll);
    };
  }, [hideWhenSelector, heroSelector]);

  return visible;
}
