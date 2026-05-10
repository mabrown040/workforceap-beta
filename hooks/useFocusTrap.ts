'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * When `active`, moves focus into the container and traps Tab; Escape calls `onEscape`.
 * Form controls (`input`, `select`, `textarea`) are included so modal forms are keyboard-usable.
 */
export function useFocusTrap(active: boolean, onEscape?: () => void): RefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement | null>(null);
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = () => {
      const nodes = root.querySelectorAll<HTMLElement>(
        [
          'a[href]',
          'button:not([disabled])',
          'input:not([disabled]):not([type="hidden"])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          'summary',
          '[tabindex]:not([tabindex="-1"])',
        ].join(', ')
      );
      return Array.from(nodes).filter((el) => {
        if (el.getAttribute('aria-hidden') === 'true') return false;
        if (el.closest('[inert]')) return false;
        return true;
      });
    };

    const t = window.setTimeout(() => getFocusable()[0]?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscapeRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = getFocusable();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      const contained = activeEl ? root.contains(activeEl) : false;
      if (!contained) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey) {
        if (activeEl === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [active]);

  return ref;
}
