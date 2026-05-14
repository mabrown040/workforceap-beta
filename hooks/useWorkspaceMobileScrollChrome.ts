'use client';

import { useEffect, useRef } from 'react';

/** Toggles compact portal chrome (header + tab strips + mobile bottom nav) on small viewports. */
export const WAP_PORTAL_CHROME_COMPACT_CLASS = 'wap-portal-chrome-compact';

/** Align with Tailwind `md` / MemberPortalTopNav / MobileBottomNav (768px). */
const MOBILE_MQ = '(max-width: 768px)';
const NEAR_TOP_PX = 12;
/** Compact chrome after a short scroll so sticky bars free viewport sooner. */
const COMPACT_AFTER_Y = 44;

/**
 * When the user scrolls down on mobile, adds `wap-portal-chrome-compact` to `<html>` so CSS can
 * shrink the workspace header, collapse captions on MemberPortalTopNav / MobileBottomNav, and
 * tighten bottom clearance. Returning near the top restores full chrome, which avoids flicker from
 * tiny upward scroll corrections while reading.
 */
export function useWorkspaceMobileScrollChrome() {
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mq = window.matchMedia(MOBILE_MQ);
    const root = document.documentElement;

    const setCompact = (compact: boolean) => {
      if (compact) root.classList.add(WAP_PORTAL_CHROME_COMPACT_CLASS);
      else root.classList.remove(WAP_PORTAL_CHROME_COMPACT_CLASS);
    };

    const update = () => {
      frame.current = null;
      if (!mq.matches) {
        setCompact(false);
        return;
      }
      const y = window.scrollY;

      if (y < NEAR_TOP_PX) {
        setCompact(false);
      } else if (y >= COMPACT_AFTER_Y) {
        setCompact(true);
      }
    };

    const onScroll = () => {
      if (frame.current != null) return;
      frame.current = window.requestAnimationFrame(update);
    };

    const onMqChange = () => {
      if (!mq.matches) setCompact(false);
      update();
    };

    update();

    window.addEventListener('scroll', onScroll, { passive: true });
    mq.addEventListener('change', onMqChange);

    return () => {
      window.removeEventListener('scroll', onScroll);
      mq.removeEventListener('change', onMqChange);
      if (frame.current != null) window.cancelAnimationFrame(frame.current);
      root.classList.remove(WAP_PORTAL_CHROME_COMPACT_CLASS);
    };
  }, []);
}
