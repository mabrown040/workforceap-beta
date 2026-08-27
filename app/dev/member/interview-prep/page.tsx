import { notFound } from 'next/navigation';
import { InterviewPrepKit } from '@/components/portal/kit/pages/member/InterviewPrepKit';
import type { PrepBundleItem } from '@/components/portal/InterviewPrepBundle';

/**
 * Credential-free proofs for interview prep (toolkit destination).
 *   /dev/member/interview-prep              — empty (run a tool)
 *   /dev/member/interview-prep?state=filled — selected bundle cards
 */
export const dynamic = 'force-dynamic';

const FILLED: PrepBundleItem[] = [
  {
    toolType: 'resume_rewriter',
    title: 'Resume',
    createdAt: '2026-08-12T12:00:00.000Z',
    content:
      'Jordan Reyes — Cloud support, Austin TX.\nSummary: IT support graduate who triages VPN tickets, writes runbooks, and has lab hours on AWS.',
  },
  {
    toolType: 'cover_letter',
    title: 'Cover letter',
    createdAt: '2026-08-14T12:00:00.000Z',
    content:
      'I am applying for the hybrid Austin cloud support seat. I isolate cost spikes in Cost Explorer and write the runbook the on-call rotation uses next.',
  },
  {
    toolType: 'interview_practice',
    title: 'Interview practice',
    createdAt: '2026-08-18T12:00:00.000Z',
    content:
      'Q: Tell me about a time you investigated a production issue.\nA: Situation — $12K AWS spike. Task — find the service. Action — CloudWatch + auto-scaling group. Result — spend back to baseline in 48 hours.',
  },
];

export default async function DevMemberInterviewPrepPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const filled = state === 'filled';

  return (
    <InterviewPrepKit
      preview
      items={filled ? FILLED : []}
      backHref="/dev/member/toolkit"
    />
  );
}
