import type { Application, ApplicationStatus } from '@prisma/client';

export type MemberApplicationStage =
  | 'applied'
  | 'under_review'
  | 'accepted'
  | 'enrolled'
  | 'active'
  | 'rejected';

export const MEMBER_APPLICATION_PROGRESS_STEPS = [
  'Applied',
  'Under review',
  'Approved',
  'Program selected',
  'Training preassessment complete',
] as const;

export type MemberApplicationStatusView = {
  stage: MemberApplicationStage;
  label: string;
  submittedAt: Date | null;
  programInterest: string | null;
  nextStep: string;
  nextStepHref: string;
  showResponseEstimate: boolean;
  /** 1–5 = index in MEMBER_APPLICATION_PROGRESS_STEPS; null when not on linear path (e.g. rejected) */
  progressIndex: number | null;
};

function stageFromRow(
  app: Pick<Application, 'status' | 'programInterest' | 'submittedAt' | 'createdAt'>,
  member: { enrolledProgram: string | null; enrolledAt: Date | null; assessmentCompleted: boolean }
): MemberApplicationStage {
  // Enrollment supersedes application status — once enrolled, show training state
  if (member.enrolledProgram) {
    if (member.assessmentCompleted) return 'active';
    return 'enrolled';
  }
  if (app.status === 'DENIED') return 'rejected';
  if (app.status === 'PENDING') return 'applied';
  if (app.status === 'NEEDS_INFO') return 'under_review';
  if (app.status === 'APPROVED') return 'accepted';
  return 'applied';
}

export function buildMemberApplicationStatusView(
  app: Pick<Application, 'status' | 'programInterest' | 'submittedAt' | 'createdAt'> | null,
  member: { enrolledProgram: string | null; enrolledAt: Date | null; assessmentCompleted: boolean }
): MemberApplicationStatusView | null {
  if (!app) return null;

  const stage = stageFromRow(app, member);
  const submittedAt = app.submittedAt ?? app.createdAt;
  const programInterest = app.programInterest ?? null;

  const showResponseEstimate = app.status === 'PENDING' || app.status === 'NEEDS_INFO';

  const labels: Record<MemberApplicationStage, string> = {
    applied: 'Applied',
    under_review: 'Under review',
    accepted: 'Approved',
    enrolled: 'Program selected',
    active: 'Training preassessment complete',
    rejected: 'Application closed',
  };

  const nextSteps: Record<MemberApplicationStage, string> = {
    applied:
      'Our team is reviewing your application. Watch your email for next steps from a counselor.',
    under_review:
      'We may need a bit more information. Check your email for any requests from our team.',
    accepted:
      'Choose your program and complete your profile so we can finalize enrollment.',
    enrolled:
      'Complete your Training Preassessment so your dashboard can show the right training steps.',
    active:
      'Your Training Preassessment is complete. Follow the next step on your dashboard to keep moving toward training and job support.',
    rejected:
      "We're unable to move forward with this application at this time. Reach out to us at info@workforceap.org if you have questions or would like to discuss next steps.",
  };

  const nextStepHrefs: Record<MemberApplicationStage, string> = {
    applied: '/dashboard/messages',
    under_review: '/dashboard/messages',
    accepted: '/dashboard/profile',
    enrolled: '/dashboard/training',
    active: '/dashboard/ai-tools',
    rejected: 'mailto:info@workforceap.org',
  };

  const progressIndex: number | null =
    stage === 'applied'
      ? 1
      : stage === 'under_review'
        ? 2
        : stage === 'accepted'
          ? 3
          : stage === 'enrolled'
            ? 4
            : stage === 'active'
              ? 5
              : null;

  return {
    stage,
    label: labels[stage],
    submittedAt,
    programInterest,
    nextStep: nextSteps[stage],
    nextStepHref: nextStepHrefs[stage],
    showResponseEstimate,
    progressIndex,
  };
}

export function applicationStatusForPublicLookup(status: ApplicationStatus): 'applied' | 'under_review' | 'accepted' | 'rejected' {
  if (status === 'DENIED') return 'rejected';
  if (status === 'APPROVED') return 'accepted';
  if (status === 'NEEDS_INFO') return 'under_review';
  return 'applied';
}
