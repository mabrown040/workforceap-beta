import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PROGRAMS, getProgramDisplayTitle, getProgramDisplayPartner } from '@/lib/content/programs';
import { buildPageMetadataAsync } from '@/app/seo';
import { SingleProgramLanding } from '@/components/marketing/SingleProgramLanding';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const program = PROGRAMS.find((p) => p.slug === slug);
  if (!program) return { title: 'Program Not Found' };

  const t = await getTranslations('programs');
  const title = `${getProgramDisplayTitle(program)} — ${t('metaTitleSuffix')}`;
  const description = t('metaDescription', {
    program: program.title,
    salary: program.salary,
    duration: program.duration,
  });

  return buildPageMetadataAsync({
    title,
    description,
    path: `/programs/${slug}`,
    image: `/api/og/program?slug=${slug}`,
  });
}

export async function generateStaticParams() {
  return PROGRAMS.map((p) => ({ slug: p.slug }));
}

export default async function ProgramPage({ params }: Props) {
  const { slug } = await params;
  const program = PROGRAMS.find((p) => p.slug === slug);

  if (!program) {
    notFound();
  }

  return <SingleProgramLanding program={program} />;
}
