import { notFound } from 'next/navigation';
import { LinkedInHeadlineKit } from '@/components/portal/kit/pages/member/LinkedInHeadlineKit';

/**
 * Credential-free proofs for LinkedIn headline (toolkit destination).
 *   /dev/member/linkedin-headline              — kit form
 *   /dev/member/linkedin-headline?state=filled — form + generated options
 */
export const dynamic = 'force-dynamic';

const SEED = {
  initialRole: 'Cloud support specialist',
  initialSkills: 'AWS, Cost Explorer, runbooks',
  initialYears: '2 years',
};

const HEADLINES = [
  'Cloud support specialist | AWS labs, runbooks, and ticket triage',
  'IT support graduate who isolates cost spikes before they hit the bill',
  'Austin cloud support — Cost Explorer, on-call notes, and clean handoffs',
];

export default async function DevMemberLinkedInHeadlinePage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const filled = state === 'filled';

  return (
    <LinkedInHeadlineKit
      preview
      backHref="/dev/member/toolkit"
      {...SEED}
      previewHeadlines={filled ? HEADLINES : undefined}
    />
  );
}
