'use client';

import { useCallback, useLayoutEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';

/**
 * Portal Design Kit — roving-tabindex list focus.
 *
 * Port of the Astryx `useListFocus` pattern (docs/ASTRYX_LESSONS.md, Lesson 4)
 * for tablists, menus, and keyboard-navigable result lists (e.g. retrofitting
 * UniversalSearch results): exactly one item in the collection is tabbable at
 * a time; Arrow keys / Home / End move the active tab stop.
 *
 * Items are discovered by a data attribute so the hook works with any markup:
 *
 *   const { containerRef, onKeyDown } = useListFocus({ orientation: 'horizontal' });
 *   <div role="tablist" ref={containerRef} onKeyDown={onKeyDown}>
 *     <button role="tab" data-kit-list-item>…</button>
 *     …
 *   </div>
 *
 * A `syncTabStops` repair pass runs on every layout effect, so items added or
 * removed after mount keep a valid single tab stop.
 */

export const LIST_ITEM_ATTR = 'data-kit-list-item';

export interface ListFocusOptions {
  /** Arrow-key axis. `horizontal` also swaps arrows under `dir="rtl"`. Default `vertical`. */
  orientation?: 'horizontal' | 'vertical' | 'both';
  /** Wrap from last → first and first → last (default true). */
  loop?: boolean;
  /** Move focus (not just tabindex) when arrows fire (default true). */
  focusOnMove?: boolean;
}

function getItems(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(`[${LIST_ITEM_ATTR}]`)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true'
  );
}

export function useListFocus<T extends HTMLElement = HTMLElement>(options: ListFocusOptions = {}): {
  containerRef: RefObject<T | null>;
  onKeyDown: (e: ReactKeyboardEvent) => void;
  /** Imperatively make one item the tab stop (e.g. on selection change). */
  setActiveItem: (item: HTMLElement) => void;
} {
  const { orientation = 'vertical', loop = true, focusOnMove = true } = options;
  const containerRef = useRef<T | null>(null);

  const syncTabStops = useCallback((preferred?: HTMLElement) => {
    const container = containerRef.current;
    if (!container) return;
    const items = getItems(container);
    if (items.length === 0) return;
    const current =
      (preferred && items.includes(preferred) ? preferred : undefined) ??
      items.find((el) => el.tabIndex === 0) ??
      items[0];
    for (const el of items) {
      el.tabIndex = el === current ? 0 : -1;
    }
  }, []);

  // Repair pass: keeps exactly one tab stop as items mount/unmount.
  useLayoutEffect(() => {
    syncTabStops();
  });

  const setActiveItem = useCallback(
    (item: HTMLElement) => {
      syncTabStops(item);
    },
    [syncTabStops]
  );

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const items = getItems(container);
      if (items.length === 0) return;

      const target = e.target as HTMLElement;
      const fromIndex = items.findIndex((el) => el === target || el.contains(target));
      if (fromIndex === -1) return;

      const rtl = getComputedStyle(container).direction === 'rtl';
      let delta = 0;
      let toIndex = -1;

      switch (e.key) {
        case 'ArrowDown':
          if (orientation === 'horizontal') return;
          delta = 1;
          break;
        case 'ArrowUp':
          if (orientation === 'horizontal') return;
          delta = -1;
          break;
        case 'ArrowRight':
          if (orientation === 'vertical') return;
          delta = rtl ? -1 : 1;
          break;
        case 'ArrowLeft':
          if (orientation === 'vertical') return;
          delta = rtl ? 1 : -1;
          break;
        case 'Home':
          toIndex = 0;
          break;
        case 'End':
          toIndex = items.length - 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      if (toIndex === -1) {
        toIndex = fromIndex + delta;
        if (loop) {
          toIndex = (toIndex + items.length) % items.length;
        } else {
          toIndex = Math.max(0, Math.min(items.length - 1, toIndex));
        }
      }

      const next = items[toIndex];
      syncTabStops(next);
      if (focusOnMove) next.focus();
    },
    [orientation, loop, focusOnMove, syncTabStops]
  );

  return { containerRef, onKeyDown, setActiveItem };
}
