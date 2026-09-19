process.env.TZ = 'UTC';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { todayInPortalTimezone } from '@/lib/date/todayInPortalTimezone';

describe('todayInPortalTimezone', () => {
  afterEach(() => vi.useRealTimers());

  it('uses the Central calendar day, not the UTC one, late in the Central evening', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-20T02:00:00Z')); // 9:00 PM CDT on Sep 19
    expect(todayInPortalTimezone()).toBe('2026-09-19');
  });

  it('agrees with UTC once Central has also rolled over', () => {
    expect(todayInPortalTimezone(new Date('2026-09-20T12:00:00Z'))).toBe('2026-09-20');
  });

  it('handles the standard-time offset in winter', () => {
    expect(todayInPortalTimezone(new Date('2026-01-01T05:30:00Z'))).toBe('2025-12-31');
  });
});
