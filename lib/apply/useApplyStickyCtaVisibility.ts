'use client';

import { useEffect, useState } from 'react';

const MOBILE_MQ = '(max-width: 768px)';
const DEFAULT_HERO_SELECTOR = '.apply-hero, .paid-apply-hero';
const FALLBACK_SCROLL_THRESHOLD = 400;

/**
 * Shows a mobile sticky CTA after the apply hero leaves the viewport, but hides it
 * when the apply form region is in view so it does not cover submit buttons.
 * @param hideWhenSelector CSS selector for the form card/region (e.g. `.apply-main-form`).
 */
export function useApplyStickyCtaVisibility(
  hideWhenSelector: string,
  heroSelector = DEFAULT_HERO_SELECTOR,
) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const formTarget = document.querySelector(hideWhenSelector);
    const hero = document.querySelector(heroSelector);
    let heroPast = false;
    let formIntersecting = false;

    const recompute = () => {
      setVisible(mq.matches && heroPast && !formIntersecting);
    };

    let formObserver: IntersectionObserver | undefined;
    if (formTarget) {
      formObserver = new IntersectionObserver(
        ([entry]) => {
          formIntersecting = entry.isIntersecting;
          recompute();
        },
        {
          rootMargin: '-72px 0px calc(-4.5rem - env(safe-area-inset-bottom, 0px)) 0px',
          threshold: 0.05,
        },
      );
      formObserver.observe(formTarget);
    }

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
      formObserver?.disconnect();
      heroObserver?.disconnect();
      window.removeEventListener('scroll', onScroll);
      mq.removeEventListener('change', onScroll);
    };
  }, [hideWhenSelector, heroSelector]);

  return visible;
}
