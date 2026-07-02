import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

describe('Employers Page — honest trust presentation', () => {
  // NOTE: the Next.js app/employers/page.tsx was deleted in the Astro
  // marketing migration (PR #2073) — /employers is now served by
  // marketing/src/pages/employers.astro. The old source-reading assertions
  // against that page were removed with it; the checks below cover the
  // pieces that still live in this repo's Next app.

  it('keeps trust pricing and intake copy aligned with the current monetization framing', () => {
    const messagesPath = path.resolve(__dirname, '../../messages/en.json');
    const messages = JSON.parse(readFileSync(messagesPath, 'utf-8')) as {
      marketing: { employers: Record<string, string> };
    };
    const copy = messages.marketing.employers;

    // Copy moved from "pipeline subscription" to contingent pricing per the
    // monetization-spine decision; the guard now pins the current framing
    // and still blocks a regression to booking-call CTAs.
    expect(copy.trustPlaceholderTermsTag).toBe('Contingent pricing');
    expect(copy.trustPlaceholderTerms.length).toBeGreaterThan(10);
    expect(copy.intakeCopy).toMatch(/follow up within/i);
    expect(copy.intakeCopy).not.toMatch(/book a call/i);
  });

  it('uses a forward icon on the hero CTA instead of a calendar booking cue', () => {
    const ctaPath = path.resolve(
      __dirname,
      '../../components/marketing/employers/EmployersHeroCtaExperiment.tsx',
    );
    const source = readFileSync(ctaPath, 'utf-8');

    expect(source).toContain('arrow_forward');
    expect(source).not.toContain('calendar_today');
  });
});
