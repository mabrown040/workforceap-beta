import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { PROGRAMS, getProgramBySlug } from '@/lib/content/programs';
import { getProgramDescription } from '@/lib/content/programDescriptions';
import Footer from '@/components/Footer';
import ProgramDetailClient from './ProgramDetailClient';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return PROGRAMS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const program = getProgramBySlug(slug);
  if (!program) return { title: 'Program' };

  const salaryRange = program.salary.replace('Starting salary: ', '');
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
            {program.duration} • {program.salary}
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)' }}>
            {program.partner} certified
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="container program-detail-grid">
          <div className="program-detail-main">
            <p className="program-detail-description">{getProgramDescription(program.category)}</p>
            <ProgramDetailClient program={program} />
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
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </div>
  );
}
