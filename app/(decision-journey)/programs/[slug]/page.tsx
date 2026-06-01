import type { Metadata } from 'next';
import LocalizedLink from '@/components/LocalizedLink';
import { notFound } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { buildOgImageUrl } from '@/lib/seo/siteEnvironment';
import { PROGRAMS, getProgramBySlug, getProgramDisplayPartner, getProgramDisplayTitle } from '@/lib/content/programs';
import { PROGRAM_COMPARISON_FEATURED } from '@/lib/content/programComparisonTracks';
import { salaryRangeDisplay } from '@/lib/content/programSalaryOutcomes';
import { getProgramDescription } from '@/lib/content/programDescriptions';
import { getProgramExtra } from '@/lib/content/programExtras';
import ProgramDetailClient from './ProgramDetailClient';
import JsonLdCourse from '@/components/JsonLdCourse';
import JsonLdBreadcrumb from '@/components/JsonLdBreadcrumb';
import ProgramRelatedSection from '@/components/programs/ProgramRelatedSection';
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

  const displayTitle = getProgramDisplayTitle(program);
  const displayPartner = getProgramDisplayPartner(program);
  const salaryRange = salaryRangeDisplay(program);
    // Only name the certifying body if it's an external partner (not WorkforceAP/CPT/CLT internal certs)
  const externalPartners = ['Google', 'IBM', 'Amazon Web Services', 'Microsoft', 'CompTIA'];
  const certClause = externalPartners.includes(displayPartner)
    ? ` Earn your ${displayPartner}-recognized certification.`
    : '';
  const description = `Training in ${displayTitle} offered at no cost for qualifying members. ${program.duration}.${certClause} Starting salary ${salaryRange}. Funded pathways available. Apply today.`;
  const pageTitle = `${displayTitle} Training & Certification`;
  return buildPageMetadataAsync({
    title: pageTitle,
    description,
    path: `/programs/${slug}`,
    image: buildOgImageUrl(pageTitle, description),
  });
}

export default async function ProgramPage({ params }: Props) {
  const { slug } = await params;
  const program = getProgramBySlug(slug);
  if (!program) notFound();

  const displayTitle = getProgramDisplayTitle(program);
  const displayPartner = getProgramDisplayPartner(program);
  const externalPartners = ['Google', 'IBM', 'Amazon Web Services', 'Microsoft', 'CompTIA'];
  const partnerBadge = externalPartners.includes(displayPartner)
    ? `${displayPartner} certified`
    : displayPartner;
  const extra = getProgramExtra(slug);
  const compareBaselineSlug =
    program.slug === 'digital-literacy-empowerment-class'
      ? 'it-support-professional-certificate-ibm'
      : 'digital-literacy-empowerment-class';
  const slugInFeaturedCompare = PROGRAM_COMPARISON_FEATURED.some((f) => f.slug === program.slug);
  const relatedPrograms = getRelatedPrograms(program.slug, 3);

  return (
    <div className="inner-page program-detail-page">
      <JsonLdCourse program={program} />
      <JsonLdBreadcrumb
        items={[
          { name: 'Home', path: '/' },
          { name: 'Programs', path: '/programs' },
          { name: displayTitle },
        ]}
        currentPath={`/programs/${slug}`}
      />
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
          <h1>{displayTitle}</h1>
          <p style={{ marginTop: '0.5rem' }}>
            {program.duration} • Starting range {salaryRangeDisplay(program)} (early-career, national framing)
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
            {partnerBadge}
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
        </div>
        <div className="container program-detail-grid">
          <div className="program-detail-main">
            <p className="program-detail-description">{getProgramDescription(program.category, program.slug)}</p>

            <div
              style={{
                marginBottom: '1.5rem',
                padding: '1.5rem',
                borderRadius: '12px',
                background: 'var(--surface-container-low)',
                border: '1px solid var(--outline-variant)',
              }}
            >
              <div style={{ marginBottom: '1rem' }}>
                <p className="text-label-upper" style={{ color: 'var(--color-accent)', margin: '0 0 0.4rem' }}>
                  Program snapshot
                </p>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-on-surface)' }}>
                  What you should know before you apply
                </h2>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Best fit</h3>
                  <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                    {extra?.bestFor ?? `Members exploring ${program.categoryLabel.toLowerCase()} training with a clear first credential.`}
                  </p>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Typical roles</h3>
                  <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                    {extra?.jobOutcomes?.length ? extra.jobOutcomes.join(' · ') : `Early-career ${program.categoryLabel.toLowerCase()} roles tied to this training path.`}
                  </p>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Course preview</h3>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.7 }}>
                    {program.courses.slice(0, 4).map((course) => (
                      <li key={course.slug}>{course.name}</li>
                    ))}
                  </ul>
                  {program.courses.length > 4 ? (
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                      Plus {program.courses.length - 4} more course{program.courses.length - 4 === 1 ? '' : 's'} in the full path.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
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
                Applications take about 5 minutes. No cost for <LocalizedLink href="/apply" style={{ color: 'inherit', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' }}>qualifying members</LocalizedLink>.
                We respond within 1–2 business days.
              </p>
              <LocalizedLink
                href={`/apply?program=${program.slug}`}
                className="btn btn-primary btn-large"
                style={{ display: 'inline-block' }}
              >
                Apply Now
              </LocalizedLink>
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <LocalizedLink
                  href="/find-your-path"
                  style={{ fontSize: '0.9rem', color: 'var(--color-accent)', textDecoration: 'underline' }}
                >
                  Not sure this is right? Take the pathfinder quiz
                </LocalizedLink>
                <LocalizedLink
                  href="/program-comparison"
                  style={{ fontSize: '0.9rem', color: 'var(--color-accent)', textDecoration: 'underline' }}
                >
                  Compare programs side-by-side
                </LocalizedLink>
              </div>
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
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-accent)' }} aria-hidden="true">help</span>
                Have Questions?
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <LocalizedLink href="/faq" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: 'var(--surface-container)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'var(--color-on-surface)',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-accent)' }} aria-hidden="true">menu_book</span>
                  <span>Read FAQ</span>
                  <ArrowRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </LocalizedLink>
                <LocalizedLink href="/how-it-works" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: 'var(--surface-container)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'var(--color-on-surface)',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-accent)' }} aria-hidden="true">schedule</span>
                  <span>How It Works</span>
                  <ArrowRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </LocalizedLink>

                <LocalizedLink href="/salary-guide" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: 'var(--surface-container)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'var(--color-on-surface)',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-accent)' }} aria-hidden="true">payments</span>
                  <span>Salary Guide</span>
                  <ArrowRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </LocalizedLink>

                <LocalizedLink href="/blog" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: 'var(--surface-container)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'var(--color-on-surface)',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-accent)' }} aria-hidden="true">work</span>
                  <span>Career Tips</span>
                  <ArrowRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </LocalizedLink>
              </div>
            </div>
          </div>
          <aside className="program-detail-sidebar">
            <div className="program-sidebar-card">
              <div className="program-sidebar-meta">
                <span>⏱ {program.duration}</span>
                <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{program.salary}</span>
              </div>
              <span className="program-sidebar-partner">{partnerBadge}</span>
              <LocalizedLink href={`/apply?program=${program.slug}`} className="btn btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '1rem', textAlign: 'center' }}>
                Apply Now
              </LocalizedLink>
              <p className="program-sidebar-note">No-cost training for members.</p>
              <LocalizedLink href="/find-your-path" className="program-sidebar-quiz-link">
                Not sure? Take the pathfinder quiz →
              </LocalizedLink>
              {slugInFeaturedCompare ? (
                <LocalizedLink
                  href={`/program-comparison?compare=${program.slug},${compareBaselineSlug}`}
                  className="program-sidebar-compare-link"
                >
                  Compare side-by-side (with a common on-ramp track)
                </LocalizedLink>
              ) : null}
              <LocalizedLink
                href="/program-comparison"
                className="program-sidebar-compare-link"
                style={{ marginTop: slugInFeaturedCompare ? '0.35rem' : 0 }}
              >
                Open comparison tool (featured tracks)
              </LocalizedLink>
            </div>
          </aside>
        </div>
      </section>

    </div>
  );
}
