import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const ZEFFY_DONATION_URL =
  'https://www.zeffy.com/en-US/donation-form/donate-for-classes-on-workforceaporg';

describe('Donate page — Zeffy checkout', () => {
  const source = readFileSync(
    path.resolve(__dirname, '../../marketing/src/pages/donate.astro'),
    'utf-8',
  );

  it('uses the verified Zeffy campaign as the primary individual donation path', () => {
    expect(source.split(ZEFFY_DONATION_URL).length - 1).toBeGreaterThanOrEqual(2);
  });

  it('opens the external donation form safely', () => {
    expect(source.match(/target="_blank" rel="noopener(?: noreferrer)?"/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('does not claim that public donation payments are unavailable', () => {
    expect(source).not.toMatch(/payment rails are being finalized/i);
    expect(source).not.toMatch(/coordinate the donation manually/i);
  });
});

describe('Donate page — Community Champion tiers', () => {
  const source = readFileSync(
    path.resolve(__dirname, '../../marketing/src/pages/donate.astro'),
    'utf-8',
  );

  it('lists Bronze–Platinum cohort amounts and per-seat rates', () => {
    expect(source).toContain('<div class="wg-tier-price">$12,000</div>');
    expect(source).toContain('<div class="wg-seat-rate">$2,400 / seat / year</div>');
    expect(source).toContain('<div class="wg-tier-price">$21,600</div>');
    expect(source).toContain('<div class="wg-seat-rate">$2,160 / seat / year</div>');
    expect(source).toContain('<div class="wg-tier-price">$48,000</div>');
    expect(source).toContain('<div class="wg-seat-rate">$1,920 / seat / year</div>');
    expect(source).toContain('<div class="wg-tier-price">$84,000</div>');
    expect(source).toContain('<div class="wg-seat-rate">$1,680 / seat / year</div>');
  });

  it('shows volume discount labels and savings', () => {
    expect(source).toContain('10% group discount');
    expect(source).toContain('Save $2,400');
    expect(source).toContain('20% group discount');
    expect(source).toContain('Save $12,000');
    expect(source).toContain('30% group discount');
    expect(source).toContain('Save $36,000');
    expect(source).toContain('Silver receives 10% off');
    expect(source).toContain('Gold 20% off');
    expect(source).toContain('Platinum 30% off');
  });

  it('keeps inquiry options aligned with tier totals', () => {
    expect(source).toContain('Bronze &mdash; 5 seats ($12,000)');
    expect(source).toContain('Silver &mdash; 10 seats ($21,600)');
    expect(source).toContain('Gold &mdash; 25 seats ($48,000)');
    expect(source).toContain('Platinum &mdash; 50 seats ($84,000)');
  });

  it('does not retain prior tier totals or stacked Gold/Platinum copy', () => {
    expect(source).not.toContain('$24,000');
    expect(source).not.toContain('$54,000');
    expect(source).not.toContain('$97,200');
    expect(source).not.toContain('$1,944');
    expect(source).not.toContain('Save $6,000');
    expect(source).not.toContain('Save $22,800');
    expect(source).not.toMatch(/Platinum an additional 10% off/i);
  });
});
