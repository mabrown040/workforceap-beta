'use client';

import { useEffect, useState } from 'react';

const MOBILE_MQ = '(max-width: 768px)';
const DEFAULT_HERO_SELECTOR = '.apply-hero, .paid-apply-hero';
const FALLBACK_SCROLL_THRESHOLD = 400;

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
    const remPx = getRemPx();
    const safeAreaBottom = getSafeAreaInsetBottomPx();
    const bottomMargin = -(4.5 * remPx + safeAreaBottom);

    const formObservers: IntersectionObserver[] = [];
    formTargets.forEach((formTarget) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          formIntersectingByTarget.set(formTarget, entry.isIntersecting);
          recompute();
        },
        {
          rootMargin: `-72px 0px ${bottomMargin}px 0px`,
          threshold: 0.05,
        },
      );
      observer.observe(formTarget);
      formObservers.push(observer);
    });

    let heroObserver: IntersectionObserver | undefined;
    if (hero) {
      heroObserver = new IntersectionObserver(
        ([entry]) => {
          heroPast = !entry.isIntersecting;
          recompute();
        },
        {
          rootMargin: '-72px 0px 0px 0px',
          threshold: 0,
        },
      );
      heroObserver.observe(hero);
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
