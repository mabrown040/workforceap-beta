import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { PROGRAMS } from '../../marketing/src/data/programs';
import { CHS_PARTNER_SLUG } from '@/lib/partners/chsPartner';

describe('Concordia HS enrollment page — chs2026 referral', () => {
  const source = readFileSync(
    path.resolve(__dirname, '../../marketing/src/pages/enroll/concordia.astro'),
    'utf-8',
  );

  it('is served at the URL segment that IS the partner slug', () => {
    // The page path, the printed student link, and Partner.slug are one
    // value. If they drift, middleware captures a ref that resolves to no
    // partner and every student who uses the official link loses attribution
    // and their funding stamp, silently.
    expect(
      existsSync(
        path.resolve(__dirname, `../../marketing/src/pages/enroll/${CHS_PARTNER_SLUG}.astro`),
      ),
    ).toBe(true);
  });

  it('pins the chs2026 referral code and routes every apply CTA through it', () => {
    expect(source).toContain("const REF = 'chs2026'");
    // Per-program CTAs carry ref + program via the applyUrl helper…
    expect(source).toContain('const applyUrl = (slug: string) => `/apply?ref=${REF}&program=${slug}`');
    expect(source.match(/href=\{applyUrl\(/g)?.length).toBeGreaterThanOrEqual(1);
    // …and the hero + footer CTAs carry the bare referral link.
    expect(source).toContain('const applyBase = `/apply?ref=${REF}`');
    expect(source.match(/href=\{applyBase\}/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('lists only slugs that exist in the canonical PROGRAMS data', () => {
    const block = source.match(/const CHS_SLUGS = \[([\s\S]*?)\] as const/);
    expect(block).not.toBeNull();
    const slugs = [...block![1].matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
    expect(slugs).toHaveLength(5);
    const known = new Set(PROGRAMS.map((p) => p.slug));
    for (const slug of slugs) {
      expect(known.has(slug), `unknown program slug on Concordia page: ${slug}`).toBe(true);
    }
  });

  it('uses the locked sponsorship cost copy and never the banned word', () => {
    expect(source).toMatch(/no cost to Concordia High School students/i);
    expect(source).toContain('2026');
    expect(source).not.toMatch(/\bfree\b/i);
  });

  it('is excluded from search indexing', () => {
    expect(source).toContain('noindex');
  });
});
