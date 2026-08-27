import { notFound } from 'next/navigation';
import { MemberProgressKit } from '@/components/portal/kit/pages/member/MemberProgressKit';

/**
 * Storybook-lite showcase — MemberProgressKit (readiness ring + weekly stats
 * + milestones). Preview-only, no auth/DB. See app/dev/dashboard/page.tsx for
 * the pattern.
 */
export const dynamic = 'force-dynamic';

export default function DevMemberProgressPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <MemberProgressKit
      readinessScore={84}
      readinessNote="Finish AWS Practitioner."
      statsHeading="This week"
      readinessCoachHref="#"
    />
  );
}
