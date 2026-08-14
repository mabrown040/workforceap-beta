import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PartnerSchoolEnrollPage from '@/components/marketing/PartnerSchoolEnrollPage';
import { enrollPageCopyIsStakeSafe, resolveEnrollmentPartner } from '@/lib/enroll/resolveEnrollmentPartner';
import '@/css/enroll-school.css';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ school: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { school } = await params;
  const model = await resolveEnrollmentPartner(school);
  if (!model) {
    return { title: 'Enrollment page not found', robots: { index: false, follow: false } };
  }
  return {
    title: `${model.name} Partnership — Career Certifications for Students | WorkforceAP`,
    description: model.costSentence,
    robots: { index: false, follow: false },
  };
}

export default async function PartnerEnrollmentPage({ params }: PageProps) {
  const { school } = await params;
  const model = await resolveEnrollmentPartner(school);
  if (!model) notFound();

  const copy = `${model.headline} ${model.blurb} ${model.costSentence}`;
  if (!enrollPageCopyIsStakeSafe(copy)) {
    throw new Error(`enroll/${school}: public copy failed the no-cost stake (banned "free")`);
  }

  return <PartnerSchoolEnrollPage model={model} />;
}
