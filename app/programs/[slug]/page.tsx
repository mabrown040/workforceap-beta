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
import ProgramsDecisionJourneyNav from '@/components/ProgramsDecisionJourneyNav';
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

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <span
            style={{
              background: program.categoryColor,
              color: 'white',
              padding: '0.3rem 0.75rem',
              borderRadius: '50px',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'inline-block',
              marginBottom: '0.5rem',
            }}
          >
            {program.categoryLabel}
          </span>
          <h1>{program.title}</h1>
          <p style={{ marginTop: '0.5rem' }}>
            {program.duration} • Starting range {salaryRangeDisplay(program)} (early-career, Austin-area framing)
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)' }}>
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
            <div className="program-bottom-cta" style={{ 
              marginTop: '3rem', 
              padding: '2rem', 
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid #dee2e6'
            }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', color: '#1a1a1a' }}>
                Ready to start your career in {program.categoryLabel}?
              </h3>
              <p style={{ fontSize: '1rem', color: '#555', marginBottom: '1.5rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
                Applications take about 10 minutes. No cost for qualifying Austin-area residents. 
                We respond within 24–48 hours.
              </p>
              <Link 
                href={`/apply?program=${program.slug}`} 
                className="btn btn-primary btn-large"
                style={{ display: 'inline-block' }}
              >
                Apply for This Program
              </Link>
            </div>

            {/* Related Resources */}
            <div style={{ 
              marginTop: '2.5rem', 
              padding: '1.5rem',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e5e5'
            }}>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HelpCircle size={20} style={{ color: '#ad2c4d' }} />
                Have Questions?
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <Link href="/faq" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#1a1a1a',
                }}>
                  <BookOpen size={18} style={{ color: '#ad2c4d' }} />
                  <span>Read FAQ</span>
                  <ArrowRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </Link>
                <Link href="/how-it-works" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#1a1a1a',
                }}>
                  <Clock size={18} style={{ color: '#ad2c4d' }} />
                  <span>How It Works</span>
                  <ArrowRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </Link>
                
                <Link href="/salary-guide" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#1a1a1a',
                }}>
                  <DollarSign size={18} style={{ color: '#ad2c4d' }} />
                  <span>Salary Guide</span>
                  <ArrowRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </Link>
                
                <Link href="/blog" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#1a1a1a',
                }}>
                  <Briefcase size={18} style={{ color: '#ad2c4d' }} />
                  <span>Career Tips</span>
                  <ArrowRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </Link>
              </div>
            </div>
          </div>
          <aside className="program-detail-sidebar">
            <div className="program-sidebar-card">
              <div className="program-sidebar-meta">
                <span>⏱ {program.duration}</span>
                <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{program.salary}</span>
              </div>
              <span className="program-sidebar-partner">{program.partner} certified</span>
              <Link href={`/apply?program=${program.slug}`} className="btn btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '1rem', textAlign: 'center' }}>
                Apply for This Program
              </Link>
              <p className="program-sidebar-note">No-cost training for qualifying participants.</p>
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
              <Link
                href="/program-comparison"
                className="program-sidebar-compare-link"
                style={{ marginTop: slugInFeaturedCompare ? '0.35rem' : 0 }}
              >
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
