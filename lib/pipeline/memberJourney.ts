/**
 * Member Journey Pipeline — 7-stage progression computed from live data.
 *
 * Stages are DERIVED, not stored, so they stay accurate as member data changes.
 *
 * 1. holding     — Invited but no Coursera enrollment
 * 2. funding     — WIOA/qualification check completed
 * 3. coursera    — Has a CourseEnrollment row
 * 4. paid        — Enrollment has fundingSource set
 * 5. complete    — All program courses COMPLETED
 * 6. ready       — assessmentCompleted + resume + at least one AI tool session
 * 7. placed      — Has PlacementRecord with placedAt
 */

import { hasValidatedProgramCompletion } from '@/lib/reporting/programCompletion';
import { getProgramBySlug } from '@/lib/content/programs';

export type MemberJourneyStage =
  | 'holding'
  | 'funding'
  | 'coursera'
  | 'paid'
  | 'complete'
  | 'ready'
  | 'placed';

export const JOURNEY_STAGE_LABELS: Record<MemberJourneyStage, string> = {
  holding: 'Holding Room',
  funding: 'Funding Evaluated',
  coursera: 'Coursera Enrolled',
  paid: 'Payment Received',
  complete: 'Training Complete',
  ready: 'Workforce Ready',
  placed: 'Placed',
};

export const JOURNEY_STAGE_COLORS: Record<MemberJourneyStage, string> = {
  holding: '#6b7280',
  funding: '#d97706',
  coursera: '#2563eb',
  paid: '#16a34a',
  complete: '#7c3aed',
  ready: '#0d9488',
  placed: '#d97706',
};

export const JOURNEY_STAGE_BG: Record<MemberJourneyStage, string> = {
  holding: '#f3f4f6',
  funding: '#fffbeb',
  coursera: '#eff6ff',
  paid: '#f0fdf4',
  complete: '#faf5ff',
  ready: '#f0fdfa',
  placed: '#fffbeb',
};

export const JOURNEY_STAGE_ORDER: MemberJourneyStage[] = [
  'holding',
  'funding',
  'coursera',
  'paid',
  'complete',
  'ready',
  'placed',
];

export interface JourneyMemberData {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  createdAt: Date;
  assessmentCompleted: boolean;
  assessmentCompletedAt: Date | null;
  enrolledProgram: string | null;
  wioaQualificationJson: unknown;
  wioaReviewStatus: string | null;
  wioaReviewedAt: Date | null;
  profile: {
    resumeOriginalPath: string | null;
    resumeEnhancedPath: string | null;
  } | null;
  courseEnrollments: {
    programSlug: string;
    curriculumVersion: string;
    fundingSource: string | null;
    enrolledAt: Date;
  }[];
  courseProgress: {
    programSlug: string;
    courseSlug: string;
    status: string;
    completedAt: Date | null;
  }[];
  memberProgramProgress: {
    programSlug: string;
    coursesCompleted: number;
  }[];
  aiToolResults: { id: string }[];
  placementRecord: { placedAt: Date } | null;
  counselorAssignments: {
    counselor: {
      user: { fullName: string };
    };
  }[];
  memberEvents: { createdAt: Date }[];
}

export interface JourneyMember {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  stage: MemberJourneyStage;
  daysInStage: number;
  counselorName: string | null;
  lastActivityAt: Date | null;
  enrolledProgram: string | null;
}

function daysBetween(start: Date, end: Date = new Date()): number {
  const ms = end.getTime() - new Date(start).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function computeJourneyStage(member: JourneyMemberData): MemberJourneyStage {
  // 7. Placed
  if (member.placementRecord?.placedAt) return 'placed';

  // 6. Workforce Ready
  const hasResume =
    !!member.profile?.resumeOriginalPath || !!member.profile?.resumeEnhancedPath;
  const hasAiTool = member.aiToolResults.length > 0;
  if (member.assessmentCompleted && hasResume && hasAiTool) return 'ready';

  // 5. Training Complete
  const enrolledCanonicalSlug = member.enrolledProgram
    ? getProgramBySlug(member.enrolledProgram)?.slug ?? member.enrolledProgram
    : null;
  const enrolledAssignment = enrolledCanonicalSlug
    ? member.courseEnrollments.find(
        (enrollment) =>
          (getProgramBySlug(enrollment.programSlug)?.slug ?? enrollment.programSlug)
            === enrolledCanonicalSlug,
      )
    : null;
  if (
    enrolledAssignment
    && hasValidatedProgramCompletion(
      enrolledAssignment.programSlug,
      enrolledAssignment.curriculumVersion,
      member.memberProgramProgress,
    )
  ) {
    return 'complete';
  }

  // 4. Payment Received
  if (member.courseEnrollments.some((ce) => !!ce.fundingSource)) return 'paid';

  // 3. Coursera Enrolled
  if (member.courseEnrollments.length > 0) return 'coursera';

  // 2. Funding Evaluated
  if (member.wioaQualificationJson != null || member.wioaReviewStatus != null) return 'funding';

  // 1. Holding Room
  return 'holding';
}

export function computeDaysInStage(
  member: JourneyMemberData,
  stage: MemberJourneyStage
): number {
  const now = new Date();
  switch (stage) {
    case 'placed':
      return member.placementRecord?.placedAt
        ? daysBetween(member.placementRecord.placedAt, now)
        : 0;
    case 'ready':
      return member.assessmentCompletedAt
        ? daysBetween(member.assessmentCompletedAt, now)
        : daysBetween(member.createdAt, now);
    case 'complete': {
      const lastCompleted = member.courseProgress
        .filter((cp) => cp.status === 'COMPLETED' && cp.completedAt)
        .map((cp) => cp.completedAt!)
        .sort((a, b) => b.getTime() - a.getTime())[0];
      return lastCompleted
        ? daysBetween(lastCompleted, now)
        : member.courseEnrollments[0]?.enrolledAt
          ? daysBetween(member.courseEnrollments[0].enrolledAt, now)
          : daysBetween(member.createdAt, now);
    }
    case 'paid': {
      const firstFunded = member.courseEnrollments
        .filter((ce) => !!ce.fundingSource)
        .map((ce) => ce.enrolledAt)
        .sort((a, b) => a.getTime() - b.getTime())[0];
      return firstFunded ? daysBetween(firstFunded, now) : 0;
    }
    case 'coursera': {
      const firstEnrolled = member.courseEnrollments
        .map((ce) => ce.enrolledAt)
        .sort((a, b) => a.getTime() - b.getTime())[0];
      return firstEnrolled ? daysBetween(firstEnrolled, now) : 0;
    }
    case 'funding':
      return member.wioaReviewedAt
        ? daysBetween(member.wioaReviewedAt, now)
        : daysBetween(member.createdAt, now);
    case 'holding':
    default:
      return daysBetween(member.createdAt, now);
  }
}

export function toJourneyMember(member: JourneyMemberData): JourneyMember {
  const stage = computeJourneyStage(member);
  const counselorName =
    member.counselorAssignments[0]?.counselor?.user?.fullName ?? null;
  const lastActivityAt = member.memberEvents[0]?.createdAt ?? null;

  return {
    id: member.id,
    fullName: member.fullName,
    email: member.email,
    phone: member.phone,
    stage,
    daysInStage: computeDaysInStage(member, stage),
    counselorName,
    lastActivityAt,
    enrolledProgram: member.enrolledProgram,
  };
}
