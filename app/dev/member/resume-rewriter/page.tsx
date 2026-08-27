import { notFound } from 'next/navigation';
import { ResumeRewriterKit } from '@/components/portal/kit/pages/member/ResumeRewriterKit';

/**
 * Credential-free proofs for resume rewriter (toolkit destination).
 *   /dev/member/resume-rewriter              — kit form
 *   /dev/member/resume-rewriter?state=filled — form + rewritten resume
 * Write POSTs / resume hydrate / file extract are skipped in preview.
 */
export const dynamic = 'force-dynamic';

const SEED = {
  initialJobTarget: 'Cloud Support Associate',
  initialTargetSalary: '$40,000 - $60,000',
  initialTargetLocation: 'Austin, TX',
  initialResume:
    'Jordan Reyes — Cloud support, Austin TX.\nIT support graduate. VPN triage, runbooks, AWS lab hours.',
};

const REWRITE = `JORDAN REYES
Austin, TX | Cloud Support Associate

SUMMARY
IT support graduate targeting hybrid Austin cloud support. Isolates Cost Explorer spikes and writes the runbook the on-call rotation uses next.

EXPERIENCE
WorkforceAP — Cloud support lab
- Triaged VPN tickets and logged AWS lab hours against Cost Explorer, runbooks, and ticket queues named in hybrid Austin cloud-support postings.
- Documented triage steps so the next on-call can replay the same isolation path.

EDUCATION
IT Support certificate — CompTIA A+ track`;

export default async function DevMemberResumeRewriterPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const filled = state === 'filled';

  return (
    <ResumeRewriterKit
      preview
      backHref="/dev/member/toolkit"
      {...SEED}
      previewOutput={filled ? REWRITE : undefined}
    />
  );
}
