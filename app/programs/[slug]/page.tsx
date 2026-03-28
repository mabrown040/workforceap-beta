import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { PROGRAMS, getProgramBySlug } from '@/lib/content/programs';
import { PROGRAM_COMPARISON_FEATURED } from '@/lib/content/programComparisonTracks';
import { salaryRangeDisplay } from '@/lib/content/programSalaryOutcomes';
import { getProgramDescription } from '@/lib/content/programDescriptions';
import { getProgramExtra } from '@/lib/content/programExtras';
import Footer from '@/components/Footer';
import ProgramDetailClient from './ProgramDetailClient';
import ProgramRelatedSection from '@/components/programs/ProgramRelatedSection';
import ProgramsDecisionJourneyNav from '@/components/ProgramsDecisionJourneyNav';
import { getRelatedPrograms } from '@/lib/content/relatedPrograms';
import { HelpCircle, BookOpen, ArrowRight, Clock, DollarSign, Briefcase } from 'lucide-react';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return PROGRAMS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const program = getProgramBySlug(slug);
  if (!program) return { title: 'Program' };

  const salaryRange = salaryRangeDisplay(program);
    // Only name the certifying body if it's an external partner (not WorkforceAP/CPT/CLT internal certs)
  const externalPartners = ['Google', 'IBM', 'Amazon Web Services', 'Microsoft', 'CompTIA', 'MCHIT'];
  const certClause = externalPartners.includes(program.partner)
    ? ` Earn your ${program.partner}-recognized certification.`
    : '';
  const description = `Free ${program.title} training in Austin, TX. ${program.duration}.${certClause} Starting salary ${salaryRange}. No cost for qualifying Austin-area residents. Apply today.`;
  return buildPageMetadata({
    title: `Free ${program.title} Training in Austin, TX`,
    description,
    path: `/programs/${slug}`,
  });
}

export default async function ProgramPage({ params }: Props) {
  const { slug } = await params;
  const program = getProgramBySlug(slug);
  if (!program) notFound();

  const extra = getProgramExtra(slug);
  const compareBaselineSlug =
    program.slug === 'digital-literacy-empowerment-class'
      ? 'it-support-professional-certificate-ibm'
      : 'digital-literacy-empowerment-class';
  const slugInFeaturedCompare = PROGRAM_COMPARISON_FEATURED.some((f) => f.slug === program.slug);
  const relatedPrograms = getRelatedPrograms(program.slug, 3);

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <span className="program-hero-category-badge" style={{ background: program.categoryColor }}>
            {program.categoryLabel}
          </span>
          <h1>{program.title}</h1>
          <p className="program-hero-meta">
            {program.duration} • Starting range {salaryRangeDisplay(program)} (early-career, Austin-area framing)
          </p>
          <p className="program-hero-partner">
            {program.partner} certified
          </p>
          {extra && (
            <div className="program-detail-fit">
              <p className="program-detail-best-for"><strong>Best for:</strong> {extra.bestFor}</p>
              <p className="program-detail-outcomes"><strong>Job outcomes:</strong> {extra.jobOutcomes.join(' · ')}</p>
              {extra.rampNote && (
                <p className="program-detail-ramp"><strong>Ramp:</strong> {extra.rampNote}</p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <ProgramsDecisionJourneyNav current="detail" />
        </div>
        <div className="container program-detail-grid">
          <div className="program-detail-main">
            <p className="program-detail-description">{getProgramDescription(program.category)}</p>
            <ProgramDetailClient program={program} />
            
            {/* Bottom CTA Banner */}
            <div className="program-bottom-cta">
              <h3 className="program-bottom-cta-title">
                Ready to start your career in {program.categoryLabel}?
              </h3>
              <p className="program-bottom-cta-body">
                Applications take about 10 minutes. No cost for qualifying Austin-area residents.
                We respond within 24–48 hours.
              </p>
              <Link href={`/apply?program=${program.slug}`} className="btn btn-primary btn-large">
                Apply for This Program
              </Link>
            </div>

            <ProgramRelatedSection programs={relatedPrograms} />

            {/* Related Resources */}
            <div className="program-resources-card">
              <h3 className="program-resources-heading">
                <HelpCircle size={20} />
                Have Questions?
              </h3>
              <div className="program-resources-grid">
                <Link href="/faq" className="program-resource-link">
                  <BookOpen size={18} />
                  <span>Read FAQ</span>
                  <ArrowRight size={16} className="program-resource-arrow" />
                </Link>
                <Link href="/how-it-works" className="program-resource-link">
                  <Clock size={18} />
                  <span>How It Works</span>
                  <ArrowRight size={16} className="program-resource-arrow" />
                </Link>
                <Link href="/salary-guide" className="program-resource-link">
                  <DollarSign size={18} />
                  <span>Salary Guide</span>
                  <ArrowRight size={16} className="program-resource-arrow" />
                </Link>
                <Link href="/blog" className="program-resource-link">
                  <Briefcase size={18} />
                  <span>Career Tips</span>
                  <ArrowRight size={16} className="program-resource-arrow" />
                </Link>
              </div>
            </div>
          </div>
          <aside className="program-detail-sidebar">
            <div className="program-sidebar-card">
              <div className="program-sidebar-meta">
                <span>⏱ {program.duration}</span>
                <span className="program-sidebar-salary">{program.salary}</span>
              </div>
              <span className="program-sidebar-partner">{program.partner} certified</span>
              <Link href={`/apply?program=${program.slug}`} className="btn btn-primary program-sidebar-apply-btn">
                Apply for This Program
              </Link>
              <p className="program-sidebar-note">No-cost training for members.</p>
              <Link href="/find-your-path" className="program-sidebar-quiz-link">
                Not sure? Take the pathfinder quiz →
              </Link>
              {slugInFeaturedCompare ? (
                <Link
                  href={`/program-comparison?compare=${program.slug},${compareBaselineSlug}`}
                  className="program-sidebar-compare-link"
                >
                  Compare side-by-side (with a common on-ramp track)
                </Link>
              ) : null}
              <Link href="/program-comparison" className="program-sidebar-compare-link">
                Open comparison tool (featured tracks)
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </div>
  );
}
