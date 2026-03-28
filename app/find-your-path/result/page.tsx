import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import MobileBottomNav from '@/components/home/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Your Path is Clear — Career Quiz Results',
  description:
    'Your personalized career match results from the WorkforceAP quiz. See your best-fit program, expected salary, and path to certification.',
  path: '/find-your-path/result',
});

export default function CareerQuizResultPage() {
  return (
    <div className="wa-min-h-screen wa-bg-white dark:wa-bg-[#141313] wa-text-gray-900 dark:wa-text-[#e6e1e1] wa-font-sans wa-selection:bg-[#ad2c4d] wa-selection:text-white">
      {/* Top Navigation */}
      <nav className="wa-fixed wa-top-0 wa-w-full wa-z-50 wa-bg-white/60 dark:wa-bg-[rgba(20,19,19,0.6)] wa-backdrop-blur-xl wa-shadow-[0_8px_32px_rgba(173,44,77,0.08)]">
        <div className="wa-flex wa-justify-between wa-items-center wa-px-8 wa-py-4 wa-max-w-7xl wa-mx-auto">
          <Link href="/" className="wa-text-xl wa-font-bold wa-tracking-tighter wa-text-gray-900 dark:wa-text-[#e6e1e1] wa-no-underline">
            WorkforceAP
          </Link>
          <div className="wa-hidden md:wa-flex wa-gap-8 wa-items-center">
            <Link href="/find-your-path" className="wa-text-gray-600 dark:wa-text-[#debfc2] hover:wa-text-gray-900 dark:hover:wa-text-[#e6e1e1] wa-font-medium wa-text-sm wa-transition-all wa-duration-300 wa-no-underline">
              Career Quiz (2 min)
            </Link>
            <Link href="/programs" className="wa-text-gray-600 dark:wa-text-[#debfc2] hover:wa-text-gray-900 dark:hover:wa-text-[#e6e1e1] wa-font-medium wa-text-sm wa-transition-all wa-duration-300 wa-no-underline">
              Programs
            </Link>
            <Link href="/employers" className="wa-text-gray-600 dark:wa-text-[#debfc2] hover:wa-text-gray-900 dark:hover:wa-text-[#e6e1e1] wa-font-medium wa-text-sm wa-transition-all wa-duration-300 wa-no-underline">
              Employers
            </Link>
            <Link href="/about" className="wa-text-gray-600 dark:wa-text-[#debfc2] hover:wa-text-gray-900 dark:hover:wa-text-[#e6e1e1] wa-font-medium wa-text-sm wa-transition-all wa-duration-300 wa-no-underline">
              About
            </Link>
            <Link
              href="/apply"
              className="wa-bg-[#ad2c4d] wa-text-white wa-px-6 wa-py-2 wa-rounded-lg wa-font-medium wa-text-sm wa-no-underline hover:wa-brightness-110 active:wa-scale-95 wa-transition-transform"
            >
              Apply Now
            </Link>
          </div>
        </div>
      </nav>

      <main className="wa-pt-24 wa-pb-32 md:wa-pb-16 wa-px-6 wa-max-w-7xl wa-mx-auto">
        {/* Success Banner */}
        <section className="wa-mb-12 wa-text-center md:wa-text-left">
          <span className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc] wa-mb-4 wa-block">
            Assessment Complete
          </span>
          <h1 className="wa-text-5xl md:wa-text-7xl wa-font-bold wa-tracking-tighter wa-text-gray-900 dark:wa-text-[#e6e1e1] wa-mb-6">
            Your Path is Clear!
          </h1>
          <p className="wa-text-gray-600 dark:wa-text-[#debfc2] wa-text-lg wa-max-w-2xl wa-leading-relaxed">
            We&apos;ve analyzed your strengths, interests, and the local Austin labor market. Here is your ideal trajectory into a high-demand career.
          </p>
        </section>

        {/* Main Bento Results Grid */}
        <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-12 wa-gap-6">
          {/* Best Match Card (Hero Card) */}
          <div className="lg:wa-col-span-8 wa-bg-gray-50 dark:wa-bg-[#1c1b1b] wa-rounded-xl wa-overflow-hidden wa-relative wa-group">
            <div className="wa-absolute wa-inset-0 wa-bg-gradient-to-br wa-from-[rgba(173,44,77,0.2)] wa-to-transparent wa-opacity-50" />
            <div className="wa-relative wa-p-8 md:wa-p-12 wa-h-full wa-flex wa-flex-col">
              <div className="wa-flex wa-items-center wa-gap-3 wa-mb-8">
                <div className="wa-w-12 wa-h-12 wa-rounded-full wa-bg-[#006d3e] wa-flex wa-items-center wa-justify-center">
                  <svg className="wa-w-6 wa-h-6 wa-text-[#92ecb1]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </div>
                <span className="wa-text-sm wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#006d3e] dark:wa-text-[#80d99f]">
                  98% Match
                </span>
              </div>
              <h2 className="wa-text-gray-900 dark:wa-text-[#e6e1e1] wa-text-3xl md:wa-text-5xl wa-font-bold wa-tracking-tight wa-mb-4">
                Your best match is Cybersecurity Professional
              </h2>
              <p className="wa-text-gray-600 dark:wa-text-[#debfc2] wa-text-lg wa-mb-12 wa-max-w-xl">
                You demonstrate high analytical reasoning and a natural aptitude for pattern recognition—essential traits for protecting Austin&apos;s digital infrastructure.
              </p>
              <div className="wa-mt-auto wa-grid wa-grid-cols-1 md:wa-grid-cols-2 wa-gap-8 wa-pt-8 wa-border-t wa-border-gray-200 dark:wa-border-[rgba(88,65,68,0.15)]">
                <div>
                  <span className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-gray-500 dark:wa-text-[#debfc2] wa-block wa-mb-1">
                    Local Opportunity
                  </span>
                  <p className="wa-text-2xl wa-font-bold wa-text-gray-900 dark:wa-text-[#e6e1e1]">
                    Expected starting salary in Austin: $95,000+
                  </p>
                </div>
                <div className="wa-flex wa-items-end">
                  <Link
                    href="/apply"
                    className="wa-w-full wa-block wa-text-center wa-bg-[#ad2c4d] wa-text-white wa-py-5 wa-rounded-lg wa-font-bold wa-text-lg hover:wa-brightness-110 active:wa-scale-[0.98] wa-transition-all wa-shadow-[0_8px_24px_rgba(173,44,77,0.3)] wa-no-underline"
                  >
                    Apply Free — Takes 10 Minutes
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Side Cards */}
          <div className="lg:wa-col-span-4 wa-flex wa-flex-col wa-gap-6">
            {/* Market Demand */}
            <div className="wa-bg-gray-50 dark:wa-bg-[#201f1f] wa-p-8 wa-rounded-xl wa-flex-1">
              <svg className="wa-w-8 wa-h-8 wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc] wa-mb-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <h3 className="wa-text-gray-900 dark:wa-text-[#e6e1e1] wa-text-xl wa-font-bold wa-mb-2">Market Demand</h3>
              <p className="wa-text-gray-600 dark:wa-text-[#debfc2] wa-text-sm wa-mb-6">
                Austin&apos;s tech sector currently has 1,200+ open cybersecurity roles with a 15% annual growth rate.
              </p>
              <div className="wa-h-2 wa-bg-gray-200 dark:wa-bg-[#363434] wa-rounded-full wa-overflow-hidden">
                <div className="wa-h-full wa-bg-[#ad2c4d] dark:wa-bg-[#ffb2bc] wa-w-[85%] wa-rounded-full" />
              </div>
              <span className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-gray-500 dark:wa-text-[#debfc2] wa-mt-2 wa-block">
                High Growth Potential
              </span>
            </div>

            {/* Not Quite Right */}
            <div className="wa-bg-gray-100 dark:wa-bg-[#363434] wa-p-8 wa-rounded-xl wa-border wa-border-gray-200 dark:wa-border-[rgba(88,65,68,0.1)]">
              <h3 className="wa-text-gray-900 dark:wa-text-[#e6e1e1] wa-text-xl wa-font-bold wa-mb-4">Not quite right?</h3>
              <p className="wa-text-gray-600 dark:wa-text-[#debfc2] wa-text-sm wa-mb-6">
                Explore the rest of your personalized career shortlist based on your quiz responses.
              </p>
              <Link
                href="/programs"
                className="wa-w-full wa-flex wa-items-center wa-justify-center wa-gap-2 wa-border wa-border-gray-300 dark:wa-border-[rgba(88,65,68,0.3)] wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc] wa-py-3 wa-rounded-lg wa-font-bold wa-text-sm hover:wa-bg-gray-50 dark:hover:wa-bg-[#3a3939] wa-transition-colors wa-no-underline"
              >
                See other matches
                <svg className="wa-w-4 wa-h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Path to Certification */}
        <section className="wa-mt-24">
          <h2 className="wa-text-3xl wa-font-bold wa-tracking-tight wa-text-gray-900 dark:wa-text-[#e6e1e1] wa-mb-12">
            Path to Certification
          </h2>
          <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-3 wa-gap-8">
            <div className="wa-space-y-4">
              <div className="wa-text-4xl wa-font-black wa-text-gray-200 dark:wa-text-[rgba(166,138,141,0.2)]">01</div>
              <h4 className="wa-text-gray-900 dark:wa-text-[#e6e1e1] wa-font-bold wa-text-lg">Foundations Course</h4>
              <p className="wa-text-gray-600 dark:wa-text-[#debfc2] wa-text-sm wa-leading-relaxed">
                8 weeks of immersive training on network security, threat detection, and ethical hacking protocols.
              </p>
            </div>
            <div className="wa-space-y-4">
              <div className="wa-text-4xl wa-font-black wa-text-gray-200 dark:wa-text-[rgba(166,138,141,0.2)]">02</div>
              <h4 className="wa-text-gray-900 dark:wa-text-[#e6e1e1] wa-font-bold wa-text-lg">Local Mentorship</h4>
              <p className="wa-text-gray-600 dark:wa-text-[#debfc2] wa-text-sm wa-leading-relaxed">
                Connect with senior security engineers from Austin&apos;s top tech firms for real-world project guidance.
              </p>
            </div>
            <div className="wa-space-y-4">
              <div className="wa-text-4xl wa-font-black wa-text-gray-200 dark:wa-text-[rgba(166,138,141,0.2)]">03</div>
              <h4 className="wa-text-gray-900 dark:wa-text-[#e6e1e1] wa-font-bold wa-text-lg">Direct Placement</h4>
              <p className="wa-text-gray-600 dark:wa-text-[#debfc2] wa-text-sm wa-leading-relaxed">
                Guaranteed interview tracks with our 45+ hiring partners specifically looking for junior talent.
              </p>
            </div>
          </div>
        </section>

        {/* Social Proof / Testimonial Section */}
        {/* TODO: will add when real testimonials exist */}

      </main>

      {/* Footer */}
      <footer className="wa-w-full wa-border-t wa-border-gray-200 dark:wa-border-[rgba(88,65,68,0.15)] wa-bg-white dark:wa-bg-[#141313]">
        <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-3 wa-gap-12 wa-px-12 wa-py-16 wa-w-full wa-max-w-7xl wa-mx-auto">
          <div>
            <span className="wa-text-lg wa-font-black wa-text-gray-900 dark:wa-text-[#e6e1e1] wa-uppercase wa-tracking-[0.1em]">
              WorkforceAP
            </span>
            <p className="wa-mt-4 wa-text-gray-600 dark:wa-text-[#debfc2] wa-text-sm">
              Empowering Austin&apos;s workforce through data-driven career matching and rapid skill acquisition.
            </p>
          </div>
          <div className="wa-flex wa-flex-col wa-gap-4">
            <h4 className="wa-text-[#ad2c4d] wa-font-bold wa-text-sm wa-uppercase wa-tracking-[0.1em]">Navigation</h4>
            <div className="wa-flex wa-flex-wrap wa-gap-4">
              <Link href="/contact" className="wa-text-gray-600 dark:wa-text-[#debfc2] hover:wa-text-[#ad2c4d] wa-transition-colors wa-text-sm wa-no-underline">Contact</Link>
              <Link href="/privacy" className="wa-text-gray-600 dark:wa-text-[#debfc2] hover:wa-text-[#ad2c4d] wa-transition-colors wa-text-sm wa-no-underline wa-underline">Privacy</Link>
            </div>
          </div>
          <div className="wa-text-right wa-flex wa-flex-col wa-justify-end">
            <p className="wa-text-gray-600 dark:wa-text-[#debfc2] wa-text-sm">© 2024 WorkforceAP Austin. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <MobileBottomNav />
    </div>
  );
}
