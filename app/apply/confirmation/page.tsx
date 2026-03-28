import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { buildPageMetadata } from '@/app/seo';
import ApplyConfirmationCta from '@/components/apply/ApplyConfirmationCta';

export const metadata = buildPageMetadata({
  title: 'Application Received',
  description: 'Your application has been submitted successfully.',
  path: '/apply/confirmation',
});

const steps = [
  {
    number: 1,
    title: 'Review',
    description:
      'We review every application within 5 business days. A counselor will look at your goals and match you with the right program.',
  },
  {
    number: 2,
    title: 'Assessment',
    description:
      'Check your inbox (and spam folder) for a message from our team with your enrollment details and any next assessment steps.',
  },
  {
    number: 3,
    title: 'Interview Scheduling',
    description:
      'If accepted, you will receive a link to schedule a brief orientation interview and get access to your member portal.',
  },
];

export default function ApplyConfirmationPage() {
  return (
    <div className="wa-min-h-screen wa-bg-m3-surface wa-text-m3-on-surface">
      {/* Top section */}
      <section className="wa-pt-28 wa-pb-10 sm:wa-pt-36 sm:wa-pb-14">
        <div className="wa-mx-auto wa-max-w-4xl wa-px-6 wa-text-center">
          {/* Checkmark circle */}
          <div className="wa-mx-auto wa-flex wa-h-20 wa-w-20 wa-items-center wa-justify-center wa-rounded-full wa-bg-m3-primary">
            <svg
              className="wa-h-10 wa-w-10 wa-text-m3-on-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="wa-mt-6 wa-text-3xl wa-font-extrabold wa-tracking-tight sm:wa-text-4xl lg:wa-text-5xl">
            Application Received!
          </h1>
          <p className="wa-mt-3 wa-text-base wa-leading-relaxed wa-text-m3-on-surface-variant sm:wa-text-lg">
            We&apos;re excited to have you. Here&apos;s what to expect next.
          </p>
        </div>
      </section>

      {/* Two-column grid */}
      <section className="wa-pb-16 sm:wa-pb-20">
        <div className="wa-mx-auto wa-max-w-5xl wa-px-6">
          <div className="wa-grid wa-grid-cols-1 wa-gap-8 md:wa-grid-cols-2">
            {/* Left: Program card */}
            <div className="wa-rounded-2xl wa-border wa-border-m3-outline-variant/20 wa-bg-m3-surface-container-low wa-p-6 sm:wa-p-8">
              <p className="wa-text-xs wa-font-semibold wa-uppercase wa-tracking-widest wa-text-m3-primary">
                Your Selected Program
              </p>
              <h2 className="wa-mt-2 wa-text-xl wa-font-bold">
                Your program details are being processed
              </h2>
              <p className="wa-mt-3 wa-text-sm wa-leading-relaxed wa-text-m3-on-surface-variant">
                A counselor will review your application and confirm your program enrollment within 5 business days.
              </p>

              <div className="wa-mt-6">
                <Suspense
                  fallback={
                    <div className="wa-py-4 wa-text-center wa-text-sm wa-text-m3-on-surface-variant">
                      Loading next steps...
                    </div>
                  }
                >
                  <ApplyConfirmationCta />
                </Suspense>
              </div>

              {/* Contact info */}
              <div className="wa-mt-6 wa-rounded-xl wa-bg-m3-primary-container/30 wa-p-4">
                <p className="wa-text-sm wa-text-m3-on-surface">
                  <strong>Questions?</strong>{' '}
                  <a href="tel:+15127771808" className="wa-font-semibold wa-text-m3-primary wa-underline wa-underline-offset-2">
                    (512) 777-1808
                  </a>{' '}
                  or{' '}
                  <a href="mailto:info@workforceap.org" className="wa-font-semibold wa-text-m3-primary wa-underline wa-underline-offset-2">
                    info@workforceap.org
                  </a>
                </p>
              </div>
            </div>

            {/* Right: What Happens Next timeline */}
            <div className="wa-rounded-2xl wa-border wa-border-m3-outline-variant/20 wa-bg-m3-surface-container-low wa-p-6 sm:wa-p-8">
              <h2 className="wa-text-xl wa-font-bold">What Happens Next?</h2>

              <div className="wa-mt-6 wa-space-y-6">
                {steps.map((step, i) => (
                  <div key={step.number} className="wa-flex wa-gap-4">
                    {/* Number badge + connector line */}
                    <div className="wa-flex wa-flex-col wa-items-center">
                      <span className="wa-flex wa-h-9 wa-w-9 wa-shrink-0 wa-items-center wa-justify-center wa-rounded-full wa-bg-m3-primary wa-text-sm wa-font-bold wa-text-m3-on-primary">
                        {step.number}
                      </span>
                      {i < steps.length - 1 && (
                        <span className="wa-mt-1 wa-h-full wa-w-px wa-bg-m3-outline-variant/30" />
                      )}
                    </div>

                    <div className="wa-pb-2">
                      <p className="wa-text-base wa-font-semibold">{step.title}</p>
                      <p className="wa-mt-1 wa-text-sm wa-leading-relaxed wa-text-m3-on-surface-variant">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* While you wait */}
              <div className="wa-mt-8 wa-rounded-xl wa-border wa-border-m3-outline-variant/15 wa-bg-m3-surface-container wa-p-4">
                <p className="wa-text-sm wa-text-m3-on-surface">
                  <strong>While you wait:</strong> Bookmark your portal login at{' '}
                  <Link href="/login" className="wa-font-semibold wa-text-m3-primary wa-underline wa-underline-offset-2">
                    workforceap.org/login
                  </Link>
                  . You can also{' '}
                  <Link href="/apply/status" className="wa-font-semibold wa-text-m3-primary wa-underline wa-underline-offset-2">
                    check your application status
                  </Link>{' '}
                  with the email you used — no password required.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom CTA buttons */}
          <div className="wa-mt-10 wa-flex wa-flex-col wa-items-center wa-justify-center wa-gap-4 sm:wa-flex-row">
            <Link
              href="/dashboard"
              className="wa-inline-flex wa-items-center wa-rounded-full wa-bg-m3-primary wa-px-8 wa-py-3 wa-text-sm wa-font-semibold wa-text-m3-on-primary wa-transition hover:wa-opacity-90"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/programs"
              className="wa-inline-flex wa-items-center wa-rounded-full wa-border wa-border-m3-outline wa-px-8 wa-py-3 wa-text-sm wa-font-semibold wa-text-m3-on-surface wa-transition hover:wa-bg-m3-surface-container-high"
            >
              Browse Other Programs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
