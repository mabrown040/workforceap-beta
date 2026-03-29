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
    <div className="inner-page">
      {/* ── Mobile-only hero: back arrow + category chip + H1 + metadata pills + stats row (≤640px) ── */}
      <section className="sm:hidden px-4 pt-6 pb-4" style={{ background: '#fcf9f8' }}>
        {/* Back arrow */}
        <Link href="/programs" className="flex items-center gap-1 mb-4 text-sm font-medium" style={{ color: '#8c0f37' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>arrow_back</span>
          Programs
        </Link>

        {/* Category chip */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: '#e5e2e1', color: '#8c0f37' }}>
            {program.categoryLabel}
          </span>
          <div className="flex items-center gap-1 px-3 py-1 rounded-full" style={{ background: 'rgba(123,88,0,0.1)' }}>
            <span className="material-symbols-outlined text-xs" style={{ color: '#7b5800', fontSize: '0.875rem' }}>verified</span>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#7b5800' }}>Verified Cert</span>
          </div>
        </div>

        {/* H1 */}
        <h1 className="text-3xl font-extrabold tracking-tight leading-tight mb-3" style={{ color: '#1c1b1b' }}>{program.title}</h1>

        {/* Metadata pills */}
        <div className="flex gap-2 mb-5 flex-wrap">
          <div className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: '#f0edec', color: '#584144' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>schedule</span>
            {program.duration}
          </div>
          <div className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: '#f0edec', color: '#584144' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>bolt</span>
            {salaryRangeDisplay(program)}
          </div>
        </div>

        {/* Stats row — 3-col Stitch bento */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl p-3 flex flex-col justify-between" style={{ background: '#f0edec', minHeight: '7rem' }}>
            <span className="material-symbols-outlined" style={{ color: '#8c0f37', fontSize: '1.25rem' }}>workspace_premium</span>
            <p className="text-[10px] font-bold leading-tight uppercase tracking-wide" style={{ color: '#1c1b1b' }}>Industry Recognized</p>
          </div>
          <div className="rounded-xl p-3 flex flex-col justify-between" style={{ background: '#8c0f37', minHeight: '7rem', boxShadow: '0 4px 12px rgba(140,15,55,0.2)' }}>
            <span className="material-symbols-outlined text-white" style={{ fontSize: '1.25rem' }}>payments</span>
            <p className="text-[10px] font-bold leading-tight uppercase tracking-wide text-white">$0 Cost</p>
          </div>
          <div className="rounded-xl p-3 flex flex-col justify-between" style={{ background: '#f0edec', minHeight: '7rem' }}>
            <span className="material-symbols-outlined" style={{ color: '#7b5800', fontSize: '1.25rem' }}>handshake</span>
            <p className="text-[10px] font-bold leading-tight uppercase tracking-wide" style={{ color: '#1c1b1b' }}>Placement Support</p>
          </div>
        </div>
      </section>

      {/* ── Mobile-only: Career paths horizontal scroll (≤640px) ── */}
      {extra && extra.jobOutcomes.length > 0 && (
        <section className="sm:hidden py-6" style={{ background: '#fcf9f8' }}>
          <h2 className="px-4 text-lg font-bold mb-3" style={{ color: '#1c1b1b' }}>Career Outcomes</h2>
          <div className="flex gap-3 overflow-x-auto px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
            {extra.jobOutcomes.map((outcome, i) => (
              <div key={outcome} className="flex-none rounded-xl p-4" style={{ background: '#f0edec', minWidth: '180px' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#8c0f37' }}>
                  {i === 0 ? 'Entry Level' : i === 1 ? 'Entry Level' : 'Career Path'}
                </p>
                <h3 className="font-bold text-sm" style={{ color: '#1c1b1b' }}>{outcome}</h3>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="page-hero hidden sm:block">
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

      {/* ── Mobile sticky apply bar (≤640px) ── */}
      <div className="wa-md:hidden fixed bottom-[60px] left-0 w-full z-40 px-4 py-2" style={{ background: 'rgba(252,249,248,0.95)', backdropFilter: 'blur(8px)', borderTop: '1px solid rgba(222,191,194,0.3)' }}>
        <Link
          href={'/apply?program=' + program.slug}
          className="block w-full text-center font-bold py-3 rounded-lg text-sm"
          style={{ background: 'linear-gradient(135deg, #8c0f37, #ad2c4d)', color: '#fff' }}
        >
          Apply Now — Free
        </Link>
      </div>

      <MobileBottomNav />
      <Footer />
    </div>
  );
}
