import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

describe('Employers Page — honest trust presentation', () => {
  it('uses placeholder aria-label and heading when verified metrics are unavailable', () => {
    const pagePath = path.resolve(__dirname, '../../app/employers/page.tsx');
    const source = readFileSync(pagePath, 'utf-8');

    expect(source).toContain("t('trustAriaLabelLogosOnly')");
    expect(source).toContain('showLogosOnly');
    expect(source).toContain("t('trustPlaceholderHeading')");
    expect(source).toContain('employers-trust__stats--placeholder');
    expect(source).toContain("showVerifiedStats ? 'verified' : 'handshake'");
    expect(source).not.toContain("showVerifiedStats || showLogos ? 'verified'");
  });

  it('exports revalidate = 600 (10 minutes)', () => {
    const pagePath = path.resolve(__dirname, '../../app/employers/page.tsx');
    const source = readFileSync(pagePath, 'utf-8');
    const match = source.match(/export\s+const\s+revalidate\s+=\s+(\d+)/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBe(600);
  });
});
