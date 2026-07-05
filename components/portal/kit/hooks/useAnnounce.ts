'use client';

import { useCallback } from 'react';

/**
 * Portal Design Kit — screen-reader announcer.
 *
 * Port of the Astryx `useAnnounce` pattern (docs/ASTRYX_LESSONS.md, Lesson 4):
 * a pair of SINGLETON live regions created once and kept in the DOM for the
 * page's lifetime — freshly-mounted live regions are unreliable (many screen
 * readers ignore the first message), so per-component `aria-live` divs often
 * announce nothing. Repeated messages re-announce because the region is
 * cleared and re-set on the next animation frame.
 *
 *   const announce = useAnnounce();
 *   announce('12 results'); // polite (default)
 *   announce('Session expired', 'assertive');
 */

type Politeness = 'polite' | 'assertive';

const regions: Partial<Record<Politeness, HTMLElement>> = {};

function getRegion(politeness: Politeness): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const existing = regions[politeness];
  if (existing && existing.isConnected) return existing;
  const el = document.createElement('div');
  el.setAttribute('aria-live', politeness);
  el.setAttribute('role', politeness === 'assertive' ? 'alert' : 'status');
  el.setAttribute('aria-atomic', 'true');
  // Visually hidden but not display:none (which mutes live regions).
  Object.assign(el.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '-1px',
    padding: '0',
    border: '0',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(el);
  regions[politeness] = el;
  return el;
}

export function announce(message: string, politeness: Politeness = 'polite'): void {
  const region = getRegion(politeness);
  if (!region) return;
  // Clear-then-set so repeating the same message still announces.
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

/** Stable callback wrapper around `announce` for component use. */
export function useAnnounce(): (message: string, politeness?: Politeness) => void {
  return useCallback((message: string, politeness: Politeness = 'polite') => {
    announce(message, politeness);
  }, []);
}
