import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadata } from '@/app/seo';
import ApplyResultsClient from './ApplyResultsClient';
import StitchMobileNav from '@/components/stitch/StitchMobileNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Choose Your Program',
  description: 'Review your likely fit, choose the program you want to discuss, and continue to account creation.',
  path: '/apply/results',
});

export default function ApplyResultsPage() {
  return (
    <div className="wa-min-h-screen wa-bg-m3d-surface wa-text-m3d-on-surface">
      {/* Hero header */}
      <section className="wa-relative wa-overflow-hidden wa-bg-m3d-surface wa-pt-28 wa-pb-14 sm:wa-pt-36 sm:wa-pb-16">
        <div className="wa-absolute wa-inset-0 wa-bg-gradient-to-br wa-from-m3d-primary/5 wa-via-transparent wa-to-m3d-tertiary/5" />

        <div className="wa-relative wa-mx-auto wa-max-w-3xl wa-px-6 wa-text-center">
          <p className="wa-text-xs wa-font-semibold wa-uppercase wa-tracking-widest wa-text-m3d-primary">
            Assessment Complete
          </p>
          <h1 className="wa-mt-3 wa-text-4xl wa-font-extrabold wa-tracking-tight sm:wa-text-5xl">
            Your Path is Clear!
          </h1>
          <p className="wa-mt-4 wa-text-base wa-leading-relaxed wa-text-m3d-on-surface-variant">
            Pick the program you want to discuss first. You&apos;ll create your account on the next step so we can save it and follow up.
          </p>
        </div>
      </section>

      {/* Results content */}
      <section className="wa-pb-20">
        <div className="wa-mx-auto wa-max-w-5xl wa-px-6">
          <Suspense
            fallback={
              <div className="wa-py-12 wa-text-center wa-text-sm wa-text-m3d-on-surface-variant">
                Loading your results...
              </div>
            }
          >
            <ApplyResultsClient />
          </Suspense>
        </div>
      </section>

      <StitchMobileNav />
    </div>
  );
}
