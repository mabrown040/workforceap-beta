import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { PROGRAMS, getProgramBySlug } from '@/lib/content/programs';
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

  const description = `${program.duration}. Earn ${program.salary}. ${program.partner} certified. Career training for Austin-area residents.`;
  return buildPageMetadata({
    title: `${program.title} Certification`,
    description,
    path: `/programs/${slug}`,
    image: `https://www.workforceap.org/og-image.png`,
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
        <div className="container" style={{ maxWidth: '800px' }}>
          <ProgramDetailClient program={program} />
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <Link href={`/apply/results?program=${program.slug}`} className="btn btn-primary" style={{ padding: '1rem 2rem' }}>
              Apply for This Program
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
