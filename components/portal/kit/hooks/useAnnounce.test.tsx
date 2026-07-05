import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { announce, useAnnounce } from './useAnnounce';

function flushRaf() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

describe('useAnnounce', () => {
  beforeEach(() => {
    // The regions are singletons; reset DOM between tests but keep the module
    // cache — getRegion re-creates disconnected regions.
    document.body.innerHTML = '';
  });

  it('creates a singleton polite live region and announces into it', async () => {
    announce('12 results');
    await flushRaf();
    const region = document.querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region!.textContent).toBe('12 results');
    expect(region!.getAttribute('role')).toBe('status');

    announce('13 results');
    await flushRaf();
    expect(document.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);
    expect(region!.textContent).toBe('13 results');
  });

  it('clears then re-sets so repeated messages still announce', async () => {
    announce('saved');
    await flushRaf();
    const region = document.querySelector('[aria-live="polite"]')!;
    expect(region.textContent).toBe('saved');

    announce('saved');
    expect(region.textContent).toBe(''); // cleared synchronously
    await flushRaf();
    expect(region.textContent).toBe('saved'); // re-set on the next frame
  });

  it('uses a separate assertive region with role=alert', async () => {
    announce('session expired', 'assertive');
    await flushRaf();
    const region = document.querySelector('[aria-live="assertive"]');
    expect(region).not.toBeNull();
    expect(region!.getAttribute('role')).toBe('alert');
    expect(region!.textContent).toBe('session expired');
  });

  it('useAnnounce returns a stable callback', () => {
    const { result, rerender } = renderHook(() => useAnnounce());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    expect(() => result.current('hello')).not.toThrow();
  });
});
