import { notFound } from 'next/navigation';
import { LinkedInAboutKit } from '@/components/portal/kit/pages/member/LinkedInAboutKit';

/**
 * Credential-free proofs for LinkedIn About (toolkit destination).
 *   /dev/member/linkedin-about              — kit form
 *   /dev/member/linkedin-about?state=filled — form + generated About
 */
export const dynamic = 'force-dynamic';

const SEED = {
  initialRole: 'Cloud support specialist',
  initialBullets:
    'IT support graduate. VPN triage, runbooks, AWS lab hours.\nIsolated a $12K cost spike in Cost Explorer and wrote the on-call notes.',
};

const ABOUT = `I isolate AWS cost spikes and write the runbook the on-call rotation uses next.

IT support graduate in Austin. VPN triage, Cost Explorer, and clean handoffs.

Looking for a hybrid cloud support seat where evidence trails matter more than tickets closed.`;

export default async function DevMemberLinkedInAboutPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const filled = state === 'filled';

  return (
    <LinkedInAboutKit
      preview
      backHref="/dev/member/toolkit"
      resumeHref="#"
      {...SEED}
      previewOutput={filled ? ABOUT : undefined}
    />
  );
}
