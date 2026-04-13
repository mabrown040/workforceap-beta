'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useScrollAffordance<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const checkScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth) {
      el.classList.add('has-scroll');
    } else {
      el.classList.remove('has-scroll');
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    checkScroll();
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    el.addEventListener('scroll', checkScroll, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', checkScroll);
    };
  }, [checkScroll]);

  return ref;
}
