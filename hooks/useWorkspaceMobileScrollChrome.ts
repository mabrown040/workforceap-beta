'use client';

import { useEffect, useRef } from 'react';

/** Toggles compact portal chrome (header + tab strips + mobile bottom nav) on small viewports. */
export const WAP_PORTAL_CHROME_COMPACT_CLASS = 'wap-portal-chrome-compact';

/** Align with Tailwind `md` / MemberPortalTopNav / MobileBottomNav (768px). */
const MOBILE_MQ = '(max-width: 768px)';
const NEAR_TOP_PX = 14;
/** Compact chrome after a short downward scroll so sticky bars free viewport sooner. */
const SCROLL_DOWN_MIN_Y = 28;
const DELTA_PX = 6;

/**
 * When the user scrolls down on mobile, adds `wap-portal-chrome-compact` to `<html>` so CSS can
 * shrink the workspace header, collapse captions on MemberPortalTopNav / MobileBottomNav, and
 * tighten bottom clearance. Scrolling up or returning near the top restores full chrome.
 */
export function useWorkspaceMobileScrollChrome() {
  const lastY = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mq = window.matchMedia(MOBILE_MQ);
    const root = document.documentElement;

    const setCompact = (compact: boolean) => {
      if (compact) root.classList.add(WAP_PORTAL_CHROME_COMPACT_CLASS);
      else root.classList.remove(WAP_PORTAL_CHROME_COMPACT_CLASS);
    };

    const onScroll = () => {
      if (!mq.matches) {
        setCompact(false);
        lastY.current = window.scrollY;
        return;
      }
      const y = window.scrollY;
      const prev = lastY.current;

      if (y < NEAR_TOP_PX) {
        setCompact(false);
      } else if (y > prev + DELTA_PX && y > SCROLL_DOWN_MIN_Y) {
        setCompact(true);
      } else if (y < prev - DELTA_PX) {
        setCompact(false);
      }

      lastY.current = y;
    };

    const onMqChange = () => {
      if (!mq.matches) setCompact(false);
      lastY.current = window.scrollY;
      onScroll();
    };

    lastY.current = window.scrollY;
    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    mq.addEventListener('change', onMqChange);

    return () => {
      window.removeEventListener('scroll', onScroll);
      mq.removeEventListener('change', onMqChange);
      root.classList.remove(WAP_PORTAL_CHROME_COMPACT_CLASS);
    };
  }, []);
}
