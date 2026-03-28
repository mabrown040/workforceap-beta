import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/home/MobileBottomNav';
import ProgramsGrid from '@/components/programs/ProgramsGrid';
import { PROGRAMS, WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Career Training Programs in Austin, TX',
  description: `Explore ${WORKFORCEAP_PROGRAM_CATALOG_SIZE} free career training programs in Austin, TX. CompTIA, Google Cybersecurity, AWS Cloud, IBM Data Science, medical coding, manufacturing — no-cost certifications for qualifying Austin-area residents.`,
  path: '/programs',
});

export default function ProgramsPage() {
  return (
    <div className="wa-min-h-screen" style={{ background: '#141313', color: '#e6e1e1' }}>
      <main className="wa-pt-28 md:wa-pt-32 wa-pb-20 wa-px-6 md:wa-px-12 wa-mx-auto" style={{ maxWidth: '80rem' }}>
        <header className="wa-mb-12 md:wa-mb-14">
          <h1 className="wa-text-4xl md:wa-text-6xl wa-font-bold wa-mb-5 wa-leading-[1.05]" style={{ color: '#e6e1e1' }}>
            Programs Built for
            <span className="wa-block wa-italic" style={{ color: '#ffb2bc' }}>
              Real Job Outcomes
            </span>
          </h1>
          <p className="wa-text-base md:wa-text-lg wa-mb-10 wa-max-w-3xl" style={{ color: '#debfc2' }}>
            Browse detailed training tracks, compare skills and certifications, then expand any card to review curriculum, learner fit, and next steps.
          </p>

          <ProgramsGrid programs={PROGRAMS} />
        </header>

        <div className="wa-flex wa-flex-wrap wa-gap-4 wa-justify-center wa-mt-12">
          <Link
            href="/find-your-path"
            className="wa-px-6 wa-py-3 wa-font-bold wa-text-sm wa-no-underline"
            style={{ background: '#ad2c4d', color: '#fff' }}
          >
            Not sure? Find Your Career
          </Link>
          <Link
            href="/program-comparison"
            className="wa-px-6 wa-py-3 wa-font-bold wa-text-sm wa-no-underline wa-border"
            style={{ borderColor: 'rgba(255,178,188,0.35)', color: '#ffb2bc' }}
          >
            Compare Programs
          </Link>
          <Link
            href="/salary-guide"
            className="wa-px-6 wa-py-3 wa-font-bold wa-text-sm wa-no-underline"
            style={{ color: '#debfc2' }}
          >
            Salary Guide
          </Link>
        </div>
      </main>

      <MobileBottomNav />
      <Footer />
    </div>
  );
}
