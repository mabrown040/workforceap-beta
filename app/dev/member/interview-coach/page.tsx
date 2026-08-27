import { notFound } from 'next/navigation';
import { InterviewCoachKit } from '@/components/portal/kit/pages/member/InterviewCoachKit';

/**
 * Credential-free proofs for interview coach (toolkit destination).
 *   /dev/member/interview-coach                 — setup form
 *   /dev/member/interview-coach?state=interview — first question
 *   /dev/member/interview-coach?state=feedback  — feedback card
 * History fetch / session POSTs / mic are skipped in preview.
 */
export const dynamic = 'force-dynamic';

const ROLE = 'Cloud support specialist';
const QUESTION = 'Tell me about yourself and your interest in the Cloud support specialist role.';
const FEEDBACK =
  'You answered in complete sentences and named the role. Next pass: add a specific metric and who you handed off to.';

export default async function DevMemberInterviewCoachPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const phase = state === 'interview' ? 'interview' : state === 'feedback' ? 'feedback' : 'setup';

  return (
    <InterviewCoachKit
      preview
      backHref="/dev/member/toolkit"
      initialRole={phase === 'setup' ? '' : ROLE}
      initialPhase={phase}
      initialQuestion={phase === 'interview' ? QUESTION : undefined}
      initialFeedback={phase === 'feedback' ? FEEDBACK : undefined}
    />
  );
}
