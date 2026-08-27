import { notFound } from 'next/navigation';
import { JobMatchScorerKit } from '@/components/portal/kit/pages/member/JobMatchScorerKit';

/**
 * Credential-free proofs for job match scorer (toolkit destination).
 *   /dev/member/job-match              — kit form
 *   /dev/member/job-match?state=filled — form + analysis results
 *   /dev/member/job-match?state=error  — shared tool failure chrome
 * Analyze POSTs / file input are skipped in preview.
 */
export const dynamic = 'force-dynamic';

const SEED = {
  initialJobUrl: 'https://jobs.ashbyhq.com/example/cloud-support',
  initialJobDescription:
    'Hybrid Austin cloud support. Cost Explorer, runbooks, and ticket triage. CompTIA A+ or Google IT Support preferred.',
  initialResume:
    'Jordan Reyes — Cloud support, Austin TX.\nIT support graduate.\nVPN triage, runbooks, AWS lab hours.',
};

const FILLED_PARSED = {
  matchScore: 72,
  strengths: [
    'AWS lab hours on Cost Explorer tickets',
    'VPN triage runbooks',
    'IT support graduate',
  ],
  gaps: ['Azure production Cost Explorer ownership', 'On-call rotation experience'],
  quickWins: [
    'Add Cost Explorer runbooks with a dollar impact on the AWS lab hours line',
    'Name the VPN triage queue and tickets closed per week',
  ],
  rawText: '',
};

const FILLED_OUTPUT = `Match 72%.

Strengths: AWS labs, VPN triage, runbooks.
Gaps: production Cost Explorer, on-call.

Next: add a $ metric to the Cost Explorer bullet and name the ticket queue.`;

export default async function DevMemberJobMatchPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const filled = state === 'filled';
  const errored = state === 'error';

  return (
    <JobMatchScorerKit
      preview
      backHref="/dev/member/toolkit"
      {...SEED}
      previewOutput={filled ? FILLED_OUTPUT : undefined}
      previewParsed={filled ? FILLED_PARSED : undefined}
      previewError={errored ? 'Our AI tools are busy right now. Please try again in a minute.' : undefined}
    />
  );
}
