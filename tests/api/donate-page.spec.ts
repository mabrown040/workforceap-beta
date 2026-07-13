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
    expect(source).toContain(`const DONATION_URL = '${ZEFFY_DONATION_URL}'`);
    expect(source.match(/href=\{DONATION_URL\}/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('opens the external donation form safely', () => {
    expect(source.match(/target="_blank" rel="noopener noreferrer"/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('does not claim that public donation payments are unavailable', () => {
    expect(source).not.toMatch(/payment rails are being finalized/i);
    expect(source).not.toMatch(/coordinate the donation manually/i);
  });
});
