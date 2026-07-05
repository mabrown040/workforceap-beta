import { Suspense } from 'react';
import { DesignSurface, SectionHeader } from '@/components/portal/kit';
import InterviewPrepBundle from '@/components/portal/InterviewPrepBundle';

/**
 * Member Portal — WIOA INTERVIEW PREP tool page.
 * Command Center reskin of the page chrome around the existing
 * `InterviewPrepBundle` client component (bundle-fetch + email/copy logic
 * untouched).
 *
 * Target route: app/(portal)/dashboard/ai-tools/interview-prep
 * Surface: warm (member-facing).
 */

export function InterviewPrepKit() {
  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 860, margin: '0 auto', padding: 16 }} className="wa-space-y-5">
        <SectionHeader
          kicker="Career Toolkit"
          title="WIOA Interview Prep"
          goal="Prepare for your WIOA program interview and upcoming job interviews — everything you have built with our AI tools, pulled together for quick review. Email it to yourself or copy it out."
        />
        <Suspense
          fallback={
            <div
              role="status"
              aria-live="polite"
              className="wa-kit-card"
              style={{ fontSize: 13, color: 'var(--wa-muted)' }}
            >
              Building your bundle…
            </div>
          }
        >
          <InterviewPrepBundle />
        </Suspense>
      </div>
    </DesignSurface>
  );
}
