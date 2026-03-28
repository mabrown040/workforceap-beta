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
    <div
      className="wa-min-h-screen"
      style={{ background: 'var(--programs-bg, #141313)', color: 'var(--programs-text, #e6e1e1)' }}
    >
      <main
        className="wa-pt-32 wa-pb-24 wa-px-6 md:wa-px-12 wa-mx-auto"
        style={{ maxWidth: '80rem' }}
      >
        {/* Header */}
        <header className="wa-mb-16">
          <h1
            className="wa-text-5xl md:wa-text-7xl wa-font-bold wa-mb-6"
            style={{ letterSpacing: '-0.025em', lineHeight: 1.1 }}
          >
            Master Your{' '}
            <span className="wa-italic" style={{ color: '#ffb2bc' }}>
              Future
            </span>
            .
          </h1>
          <p
            className="wa-text-lg wa-mb-12"
            style={{ color: 'var(--programs-text-secondary, #debfc2)', maxWidth: '42rem' }}
          >
            Expert-led certification programs designed to bridge the gap between
            where you are and where you want to be. All programs are $0 for
            eligible residents.
          </p>

          <ProgramsGrid programs={PROGRAMS} />
        </header>

        {/* Bottom actions */}
        <div className="wa-flex wa-flex-wrap wa-gap-4 wa-justify-center wa-mt-12">
          <Link
            href="/find-your-path"
            className="wa-px-6 wa-py-3 wa-rounded-lg wa-font-bold wa-text-sm"
            style={{ background: '#ad2c4d', color: '#fff', textDecoration: 'none' }}
          >
            Not sure? Find Your Career
          </Link>
          <Link
            href="/program-comparison"
            className="wa-px-6 wa-py-3 wa-rounded-lg wa-font-bold wa-text-sm"
            style={{
              border: '1px solid rgba(255,178,188,0.3)',
              color: '#ffb2bc',
              textDecoration: 'none',
            }}
          >
            Compare programs
          </Link>
          <Link
            href="/salary-guide"
            className="wa-px-6 wa-py-3 wa-rounded-lg wa-font-bold wa-text-sm"
            style={{ color: 'var(--programs-text-secondary)', textDecoration: 'none' }}
          >
            Salary guide
          </Link>
        </div>
      </main>

      <MobileBottomNav />
      <Footer />
    </div>
  );
}
