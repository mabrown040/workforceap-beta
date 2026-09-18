import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

describe('apply confirmation clarity', () => {
  const pageSource = readFileSync(
    path.resolve(__dirname, '../../app/apply/confirmation/page.tsx'),
    'utf-8',
  );
  const cssSource = readFileSync(
    path.resolve(__dirname, '../../app/apply/apply-funnel-depth.css'),
    'utf-8',
  );
  const ctaSource = readFileSync(
    path.resolve(__dirname, '../../components/apply/ApplyConfirmationCta.tsx'),
    'utf-8',
  );

  it('keeps a single primary next-step CTA zone (footer stays secondary)', () => {
    expect(pageSource).toContain('afd-confirm__recommend');
    expect(pageSource).toContain('afd-confirm__foot-actions');
    expect(pageSource).toMatch(
      /afd-confirm__foot-actions[\s\S]*mdx-btn--ghost[\s\S]*confirmationCtaStatus/,
    );
    expect(pageSource).not.toMatch(
      /afd-confirm__foot-actions[\s\S]*mdx-btn--primary/,
    );
  });

  it('marks timeline progress with done + current steps', () => {
    expect(pageSource).toContain('afd-confirm__step--done');
    expect(pageSource).toContain('afd-confirm__step--current');
    expect(pageSource).toContain("aria-current={state === 'current' ? 'step' : undefined}");
    expect(pageSource).toContain('confirmationStepDoneLabel');
    expect(pageSource).toContain('confirmationStepCurrentLabel');
  });

  it('styles confirmation with mdx funnel tokens instead of inline --color bags', () => {
    expect(cssSource).toContain('--mdx-crimson');
    expect(cssSource).toContain('.afd-confirm__recommend');
    expect(pageSource).not.toContain("var(--color-accent)");
    expect(ctaSource).not.toContain("var(--color-accent)");
    expect(ctaSource).toContain('afd-confirm__recommend');
  });

  it('does not duplicate the primary destination in Also helpful for signed-in members', () => {
    expect(pageSource).toContain('confirmationAlsoHelpfulHeading');
    expect(pageSource).toContain('whatYouCanDoSignedIn');
    // Signed-in primary is dashboard; Also helpful should not re-list it.
    expect(pageSource).not.toMatch(
      /whatYouCanDoSignedIn = \[[\s\S]*confirmationDoDashboardLabel/,
    );
  });
});
