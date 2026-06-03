'use client';

import { useEffect, useState } from 'react';

const MOBILE_MQ = '(max-width: 768px)';
const DEFAULT_SCROLL_THRESHOLD = 320;

/**
 * Shows a mobile sticky CTA after the user scrolls past the hero, but hides it
 * when the apply form region is in view so it does not cover submit buttons.
 */
export function useApplyStickyCtaVisibility(
  hideWhenSelector: string,
  scrollThreshold = DEFAULT_SCROLL_THRESHOLD,
) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const target = document.querySelector(hideWhenSelector);
    let scrolledPast = false;
    let targetIntersecting = false;

    const recompute = () => {
      setVisible(mq.matches && scrolledPast && !targetIntersecting);
    };

    const onScroll = () => {
      scrolledPast = window.scrollY > scrollThreshold;
      recompute();
    };

    let observer: IntersectionObserver | undefined;
    if (target) {
      observer = new IntersectionObserver(
        ([entry]) => {
          targetIntersecting = entry.isIntersecting;
          recompute();
        },
        {
          rootMargin: '-72px 0px calc(-4.5rem - env(safe-area-inset-bottom, 0px)) 0px',
          threshold: 0.05,
        },
      );
      observer.observe(target);
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    mq.addEventListener('change', onScroll);

    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', onScroll);
      mq.removeEventListener('change', onScroll);
    };
  }, [hideWhenSelector, scrollThreshold]);

  return visible;
}
