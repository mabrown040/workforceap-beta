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
import MobileBottomNav from '@/components/MobileBottomNav';
import ProgramDetailClient from './ProgramDetailClient';
import ProgramRelatedSection from '@/components/programs/ProgramRelatedSection';
import ProgramsDecisionJourneyNav from '@/components/ProgramsDecisionJourneyNav';
import { getRelatedPrograms } from '@/lib/content/relatedPrograms';
import { ArrowRight } from 'lucide-react';

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
  const description = `Free ${program.title} training. ${program.duration}.${certClause} Starting salary ${salaryRange}. No cost for qualifying individuals. Apply today.`;
  return buildPageMetadata({
    title: `Free ${program.title} Training & Certification`,
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
    <div className="inner-page program-detail-page">
      <div className="md:wa-hidden marketing-mobile marketing-mobile-pb-for-bottom-nav">
        <section style={{ background: 'var(--color-surface)', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '1.5rem', paddingBottom: '1rem' }}>
          <Link
            href="/programs"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#8c0f37',
              textDecoration: 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>arrow_back</span>
            Programs
          </Link>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span
              style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: '#e5e2e1',
                color: '#8c0f37',
              }}
            >
              {program.categoryLabel}
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                background: 'rgba(123,88,0,0.1)',
              }}
            >
              <span className="material-symbols-outlined" style={{ color: '#7b5800', fontSize: '0.875rem' }}>verified</span>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7b5800' }}>Verified Cert</span>
            </div>
          </div>

          <h2 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2, marginBottom: '0.75rem', color: 'var(--color-on-surface)' }}>{program.title}</h2>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 500, background: '#f0edec', color: '#584144' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>schedule</span>
              {program.duration}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 500, background: '#f0edec', color: '#584144' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>bolt</span>
              {salaryRangeDisplay(program)}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ borderRadius: '0.75rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#f0edec', minHeight: '7rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#8c0f37', fontSize: '1.25rem' }}>workspace_premium</span>
              <p style={{ fontSize: '10px', fontWeight: 700, lineHeight: 1.25, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface)', margin: 0 }}>Industry Recognized</p>
            </div>
            <div style={{ borderRadius: '0.75rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#8c0f37', minHeight: '7rem', boxShadow: '0 4px 12px rgba(140,15,55,0.2)' }}>
              <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '1.25rem' }}>payments</span>
              <p style={{ fontSize: '10px', fontWeight: 700, lineHeight: 1.25, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fff', margin: 0 }}>$0 Cost</p>
            </div>
            <div style={{ borderRadius: '0.75rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#f0edec', minHeight: '7rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#7b5800', fontSize: '1.25rem' }}>handshake</span>
              <p style={{ fontSize: '10px', fontWeight: 700, lineHeight: 1.25, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface)', margin: 0 }}>Placement Support</p>
            </div>
          </div>
        </section>

        {extra && extra.jobOutcomes.length > 0 && (
          <section style={{ background: 'var(--color-surface)', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
            <h2 style={{ paddingLeft: '1rem', paddingRight: '1rem', fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-on-surface)' }}>Career Outcomes</h2>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                overflowX: 'auto',
                paddingLeft: '1rem',
                paddingRight: '1rem',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {extra.jobOutcomes.map((outcome, i) => (
                <div key={outcome} style={{ flex: '0 0 auto', borderRadius: '0.75rem', padding: '1rem', background: '#f0edec', minWidth: '180px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem', color: '#8c0f37' }}>
                    {i === 0 ? 'Entry Level' : i === 1 ? 'Entry Level' : 'Career Path'}
                  </p>
                  <h3 style={{ fontWeight: 700, fontSize: '0.875rem', margin: 0, color: 'var(--color-on-surface)' }}>{outcome}</h3>
                </div>
              ))}
            </div>
          </section>
        )}

        <div
          className="marketing-mobile-sticky-above-bottom-nav"
          style={{
            position: 'fixed',
            left: 0,
            width: '100%',
            zIndex: 40,
            padding: '0.5rem 1rem',
            background: 'rgba(252,249,248,0.95)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderTop: '1px solid rgba(222,191,194,0.3)',
          }}
        >
          <Link
            href={'/apply?program=' + program.slug}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'center',
              fontWeight: 700,
              padding: '0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              background: 'linear-gradient(135deg, #8c0f37, #ad2c4d)',
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            Apply Now — Free
          </Link>
        </div>
      </div>

      <section className="page-hero wa-hidden md:wa-block marketing-desktop">
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
            {program.duration} • Starting range {salaryRangeDisplay(program)} (early-career, national framing)
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
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

      <section className="content-section program-detail-shared">
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
              background: 'var(--surface-container-low)',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', color: 'var(--color-on-surface)' }}>
                Ready to start your career in {program.categoryLabel}?
              </h3>
              <p style={{ fontSize: '1rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
                Applications take about 10 minutes. No cost for qualifying individuals.
                We respond within 3–5 business days.
              </p>
              <Link 
                href={`/apply?program=${program.slug}`} 
                className="btn btn-primary btn-large"
                style={{ display: 'inline-block' }}
              >
                Apply for This Program
              </Link>
            </div>

            <ProgramRelatedSection programs={relatedPrograms} />

            {/* Related Resources */}
            <div style={{
              marginTop: '2.5rem',
              padding: '1.5rem',
              background: 'var(--surface-container-low)',
              borderRadius: '12px',
            }}>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-accent)' }}>help</span>
                Have Questions?
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <Link href="/faq" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: 'var(--surface-container)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'var(--color-on-surface)',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-accent)' }}>menu_book</span>
                  <span>Read FAQ</span>
                  <ArrowRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </Link>
                <Link href="/how-it-works" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: 'var(--surface-container)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'var(--color-on-surface)',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-accent)' }}>schedule</span>
                  <span>How It Works</span>
                  <ArrowRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </Link>

                <Link href="/salary-guide" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: 'var(--surface-container)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'var(--color-on-surface)',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-accent)' }}>payments</span>
                  <span>Salary Guide</span>
                  <ArrowRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </Link>

                <Link href="/blog" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: 'var(--surface-container)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'var(--color-on-surface)',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-accent)' }}>work</span>
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

      <MobileBottomNav />
      <Footer />
    </div>
  );
}
