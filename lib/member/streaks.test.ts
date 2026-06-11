import { describe, it, expect } from 'vitest';
import { computeNextStreak } from './streaks';

const day = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

describe('computeNextStreak', () => {
  it('starts a streak on first-ever activity', () => {
    const next = computeNextStreak(
      { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
      day('2026-06-02'),
    );
    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(1);
    expect(next.lastActiveDate).toEqual(day('2026-06-02'));
  });

  it('is idempotent within the same UTC day', () => {
    const prev = { currentStreak: 4, longestStreak: 9, lastActiveDate: day('2026-06-02') };
    const next = computeNextStreak(prev, new Date('2026-06-02T23:30:00.000Z'));
    expect(next.currentStreak).toBe(4);
    expect(next.longestStreak).toBe(9);
  });

  it('extends the streak on a consecutive day', () => {
    const prev = { currentStreak: 4, longestStreak: 4, lastActiveDate: day('2026-06-02') };
    const next = computeNextStreak(prev, day('2026-06-03'));
    expect(next.currentStreak).toBe(5);
    expect(next.longestStreak).toBe(5);
  });

  it('keeps longest when extending past a smaller current', () => {
    const prev = { currentStreak: 2, longestStreak: 10, lastActiveDate: day('2026-06-02') };
    const next = computeNextStreak(prev, day('2026-06-03'));
    expect(next.currentStreak).toBe(3);
    expect(next.longestStreak).toBe(10);
  });

  it('resets to 1 after a gap of 2+ days, preserving longest', () => {
    const prev = { currentStreak: 7, longestStreak: 7, lastActiveDate: day('2026-06-02') };
    const next = computeNextStreak(prev, day('2026-06-05'));
    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(7);
  });
});
