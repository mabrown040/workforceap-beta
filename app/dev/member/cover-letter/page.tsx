import { notFound } from 'next/navigation';
import { CoverLetterKit } from '@/components/portal/kit/pages/member/CoverLetterKit';

/**
 * Credential-free proofs for cover letter (toolkit destination).
 *   /dev/member/cover-letter              — kit form
 *   /dev/member/cover-letter?state=filled — form + letter
 * Write POSTs / resume hydrate are skipped in preview.
 */
export const dynamic = 'force-dynamic';

const SEED = {
  initialCompany: 'Ashby',
  initialJobDescription:
    'Hybrid Austin cloud support. Cost Explorer, runbooks, and ticket triage. CompTIA A+ or Google IT Support preferred.',
  initialResume:
    'Jordan Reyes — Cloud support, Austin TX.\nIT support graduate. VPN triage, runbooks, AWS lab hours.',
};

const LETTER = `Dear hiring team,

I am applying for the hybrid Austin cloud support seat. I isolate cost spikes in Cost Explorer and write the runbook the on-call rotation uses next.

At WorkforceAP I triaged VPN tickets and logged AWS lab hours against the same services this posting names. I can start on the queue without a long ramp.

Jordan Reyes
Austin, TX`;

export default async function DevMemberCoverLetterPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const filled = state === 'filled';

  return (
    <CoverLetterKit
      preview
      backHref="/dev/member/toolkit"
      {...SEED}
      previewOutput={filled ? LETTER : undefined}
    />
  );
}
