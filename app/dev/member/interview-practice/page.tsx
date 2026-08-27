import { notFound } from 'next/navigation';
import { InterviewPracticeKit } from '@/components/portal/kit/pages/member/InterviewPracticeKit';

/**
 * Credential-free proofs for interview practice (toolkit destination).
 *   /dev/member/interview-practice              — kit form
 *   /dev/member/interview-practice?state=filled — form + question set
 * Generate POSTs are skipped in preview.
 */
export const dynamic = 'force-dynamic';

const SEED = {
  role: 'Cloud support specialist',
  experienceLevel: 'entry' as const,
  resumeContext: 'IT support graduate. VPN triage, runbooks, AWS lab hours.',
};

const FILLED = [
  {
    question: 'Tell me about a time you diagnosed a production issue.',
    type: 'behavioral',
    tip: 'Name the metric and who you handed off to.',
    starHint: 'Situation: spend spike. Task: isolate the service. Action: CloudWatch. Result: back to baseline.',
    exampleAnswer:
      'A $12K AWS spike. I used CloudWatch and the autoscaling group. Spend was back to baseline in 48 hours.',
  },
  {
    question: 'How do you prioritize tickets when the queue is full?',
    type: 'situational',
    tip: 'Order by customer impact, then SLA.',
    starHint: 'Start with the ticket that blocks production.',
  },
  {
    question: 'Walk through a runbook you wrote and who used it.',
    type: 'technical',
    tip: 'Name the audience and one step that prevented a repeat.',
  },
];

export default async function DevMemberInterviewPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const filled = state === 'filled';

  return (
    <InterviewPracticeKit
      preview
      initialData={SEED}
      previewQuestions={filled ? FILLED : undefined}
      savedResults={[]}
      backHref="/dev/member/toolkit"
    />
  );
}
