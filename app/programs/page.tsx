import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import ProgramsContent from './ProgramsContent';
import ProgramsDecisionJourneyNav from '@/components/ProgramsDecisionJourneyNav';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';
import StitchFooter from '@/components/stitch/StitchFooter';
import StitchMobileNav from '@/components/stitch/StitchMobileNav';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Career Training Programs in Austin, TX',
  description: `Explore ${WORKFORCEAP_PROGRAM_CATALOG_SIZE} free career training programs in Austin, TX. CompTIA, Google Cybersecurity, AWS Cloud, IBM Data Science, medical coding, manufacturing — no-cost certifications for qualifying Austin-area residents.`,
  path: '/programs',
});

const categoryPills = [
  'All Programs',
  'AI & Software Dev',
  'Cloud & Data',
  'IT & Cybersecurity',
  'Business',
  'Healthcare',
];

export default function ProgramsPage() {
  return (
    <div className="wa-min-h-screen wa-bg-m3d-surface wa-text-m3d-on-surface">
      {/* Hero */}
      <section className="wa-relative wa-overflow-hidden wa-bg-m3d-surface wa-pt-28 wa-pb-16 sm:wa-pt-36 sm:wa-pb-20">
        {/* Subtle gradient accent */}
        <div className="wa-absolute wa-inset-0 wa-bg-gradient-to-br wa-from-m3d-primary/5 wa-via-transparent wa-to-m3d-tertiary/5" />

        <div className="wa-relative wa-mx-auto wa-max-w-7xl wa-px-6">
          <h1 className="wa-text-4xl wa-font-extrabold wa-tracking-tight sm:wa-text-5xl lg:wa-text-6xl">
            Master Your{' '}
            <em className="wa-not-italic wa-italic wa-text-m3d-primary">Future.</em>
          </h1>

          <p className="wa-mt-5 wa-max-w-2xl wa-text-lg wa-leading-relaxed wa-text-m3d-on-surface-variant">
            {WORKFORCEAP_PROGRAM_CATALOG_SIZE} no-cost career programs with industry certifications from Google, IBM, AWS, Microsoft, and CompTIA.
            Use fit, timeline, and readiness — not just the title — to choose your track.
          </p>

          {/* CTA cluster */}
          <div className="wa-mt-8 wa-flex wa-flex-wrap wa-items-center wa-gap-4">
            <ExperimentedCtaLink
              experiment="programs_primary_cta"
              variants={[
                { id: 'control', label: 'Find Your Career →', className: 'wa-inline-flex wa-items-center wa-rounded-full wa-bg-m3d-primary wa-px-7 wa-py-3 wa-text-sm wa-font-semibold wa-text-m3d-on-primary wa-transition hover:wa-opacity-90', href: '/find-your-path' },
                { id: 'quiz_first', label: 'Take 2-Min Quiz →', className: 'wa-inline-flex wa-items-center wa-rounded-full wa-bg-m3d-primary wa-px-7 wa-py-3 wa-text-sm wa-font-semibold wa-text-m3d-on-primary wa-transition hover:wa-opacity-90', href: '/find-your-path' },
              ]}
            />
            <Link
              href="/program-comparison"
              className="wa-text-sm wa-font-medium wa-text-m3d-primary wa-underline wa-underline-offset-4 wa-transition hover:wa-text-m3d-primary/80"
            >
              Or compare programs side-by-side
            </Link>
          </div>

          {/* Decorative category filter pills */}
          <div className="wa-mt-10 wa-flex wa-flex-wrap wa-gap-2">
            {categoryPills.map((pill, i) => (
              <span
                key={pill}
                className={
                  i === 0
                    ? 'wa-inline-flex wa-items-center wa-rounded-full wa-bg-m3d-tertiary-container wa-px-4 wa-py-1.5 wa-text-xs wa-font-semibold wa-text-m3d-on-tertiary-container'
                    : 'wa-inline-flex wa-items-center wa-rounded-full wa-border wa-border-m3d-outline-variant/30 wa-px-4 wa-py-1.5 wa-text-xs wa-font-medium wa-text-m3d-on-surface-variant wa-transition hover:wa-bg-m3d-surface-container-high'
                }
              >
                {pill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Decision Journey Nav */}
      <section className="wa-py-2">
        <div className="wa-mx-auto wa-max-w-7xl wa-px-6">
          <ProgramsDecisionJourneyNav current="programs" />
        </div>
      </section>

      {/* AI-powered note */}
      <section className="wa-py-4">
        <div className="wa-mx-auto wa-max-w-2xl wa-px-6 wa-text-center">
          <p className="wa-text-sm wa-leading-relaxed wa-text-m3d-on-surface-variant">
            <strong className="wa-font-semibold wa-text-m3d-on-surface">AI-powered support:</strong>{' '}
            After you enroll, the member portal includes guided tools for resumes,
            interviews, and applications — alongside counselor coaching.
          </p>
        </div>
      </section>

      {/* Program cards (real filtering lives inside ProgramsContent) */}
      <ProgramsContent />

      <StitchFooter />
      <StitchMobileNav />
    </div>
  );
}
