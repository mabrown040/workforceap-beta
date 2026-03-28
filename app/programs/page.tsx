import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import ProgramsContent from './ProgramsContent';
import ProgramsDecisionJourneyNav from '@/components/ProgramsDecisionJourneyNav';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Career Training Programs in Austin, TX',
  description: `Explore ${WORKFORCEAP_PROGRAM_CATALOG_SIZE} free career training programs in Austin, TX. CompTIA, Google Cybersecurity, AWS Cloud, IBM Data Science, medical coding, manufacturing — no-cost certifications for qualifying Austin-area residents.`,
  path: '/programs',
});

export default function ProgramsPage() {
  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary/30 selection:text-primary antialiased overflow-x-hidden min-h-screen flex flex-col">
      <main className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full flex-grow">
        {/* Header & Category Filter */}
        <header className="mb-16">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-on-surface leading-tight">
            Master Your <span className="text-primary italic">Future</span>.
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mb-8">
            Expert-led certification programs designed to bridge the gap between where you are and where you want to be. All {WORKFORCEAP_PROGRAM_CATALOG_SIZE} programs are $0 for eligible residents.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mb-12">
            <ExperimentedCtaLink
              experiment="programs_primary_cta"
              variants={[
                { id: 'control', label: 'Find Your Career →', className: 'bg-primary-container text-on-primary px-8 py-3 rounded-lg font-bold text-sm text-center hover:brightness-110 transition-all', href: '/find-your-path' },
                { id: 'quiz_first', label: 'Take 2-Min Quiz →', className: 'bg-primary-container text-on-primary px-8 py-3 rounded-lg font-bold text-sm text-center hover:brightness-110 transition-all', href: '/find-your-path' },
              ]}
            />
            <Link href="/program-comparison" className="bg-surface-container-high text-on-surface px-8 py-3 rounded-lg font-bold text-sm text-center hover:bg-surface-container-highest transition-colors">
              Compare side-by-side
            </Link>
          </div>
        </header>

        <div className="mb-8">
          <ProgramsDecisionJourneyNav current="programs" />
        </div>

        <div className="mb-12 p-6 bg-surface-container-low rounded-xl border border-outline-variant/10 max-w-3xl">
          <p className="text-sm text-on-surface-variant">
            <strong className="text-primary mr-2">AI-powered support:</strong>
            After you enroll, the member portal includes guided tools for resumes, interviews, and applications — alongside counselor coaching.
          </p>
        </div>

        <ProgramsContent />
      </main>
      <Footer />
    </div>
  );
}
