import { notFound } from 'next/navigation';
import { MemberCertificatesKit } from '@/components/portal/kit/pages/member/MemberCertificatesKit';

/**
 * Storybook-lite showcase — MemberCertificatesKit EMPTY state (nothing earned
 * or in progress yet). Preview-only, no auth/DB.
 */
export const dynamic = 'force-dynamic';

export default function DevMemberCertificatesEmptyPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <MemberCertificatesKit
      earnedCount={0}
      inProgressCount={0}
      learningHours={0}
      verifiedCount={0}
      earned={[]}
      inProgress={[]}
      counselorHref="/dev/member/messages"
    />
  );
}
