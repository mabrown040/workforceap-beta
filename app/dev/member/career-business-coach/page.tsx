import { notFound } from 'next/navigation';
import { CareerBusinessCoachKit } from '@/components/portal/kit/pages/member/CareerBusinessCoachKit';

/**
 * Credential-free proof for career and business coach (voice session UI).
 *   /dev/member/career-business-coach — kit chrome + voice surface (no live session)
 */
export const dynamic = 'force-dynamic';

export default function DevMemberCareerBusinessCoachPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return <CareerBusinessCoachKit backHref="/dev/member/toolkit" />;
}
