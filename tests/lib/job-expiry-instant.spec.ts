import { describe, expect, it } from 'vitest';

import { jobExpiryDateInput, jobExpiryInstant } from '@/lib/employer/jobExpiryInstant';

describe('jobExpiryInstant', () => {
  it('stores the END of the chosen day in Central time (CDT)', () => {
    const iso = jobExpiryInstant('2026-09-30');
    expect(iso).not.toBeNull();
    const t = Date.parse(iso as string);
    expect(t).toBeGreaterThanOrEqual(Date.parse('2026-10-01T04:59:59Z'));
    expect(t).toBeLessThan(Date.parse('2026-10-01T05:00:00Z'));
  });

  it('uses the standard-time offset in winter (CST)', () => {
    const t = Date.parse(jobExpiryInstant('2026-12-15') as string);
    expect(t).toBeGreaterThanOrEqual(Date.parse('2026-12-16T05:59:59Z'));
    expect(t).toBeLessThan(Date.parse('2026-12-16T06:00:00Z'));
  });

  it('keeps the job visible on the public board through the chosen day', () => {
    // 9:00 PM Central on the expiry date itself must still satisfy `expiresAt >= now`.
    const eveningOfExpiryDay = Date.parse('2026-10-01T02:00:00Z');
    expect(Date.parse(jobExpiryInstant('2026-09-30') as string)).toBeGreaterThan(eveningOfExpiryDay);
  });

  it('rejects empty and malformed input', () => {
    expect(jobExpiryInstant('')).toBeNull();
    expect(jobExpiryInstant(null)).toBeNull();
    expect(jobExpiryInstant('09/30/2026')).toBeNull();
  });
});

describe('jobExpiryDateInput', () => {
  it('round-trips the stored instant back to the chosen calendar day', () => {
    expect(jobExpiryDateInput(jobExpiryInstant('2026-09-30'))).toBe('2026-09-30');
    expect(jobExpiryDateInput(jobExpiryInstant('2026-12-15'))).toBe('2026-12-15');
  });

  it('returns an empty string for missing values', () => {
    expect(jobExpiryDateInput(null)).toBe('');
    expect(jobExpiryDateInput('not-a-date')).toBe('');
  });
});
