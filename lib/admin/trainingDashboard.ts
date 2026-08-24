import 'server-only';

import { CourseProgressStatus } from '@prisma/client';

import { getProgramBySlug } from '@/lib/content/programs';
import { prisma } from '@/lib/db/prisma';
import { computeTrainingProgress } from '@/lib/member/trainingProgress';
import { trainingDashboardMemberWhere } from '@/lib/admin/overviewOrgFilter';
import { deriveCareerPlanSignal, type CareerPlanSignal } from '@/lib/admin/careerPlanSignal';

export type TrainingDashboardMetrics = {
  enrolledMembers: number;
  activeInTraining: number;
  notStarted: number;
  completed: number;
  stale: number;
  averagePercent: number;
};

export type TrainingDashboardRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  enrolledProgram: string;
  programTitle: string;
  enrolledAt: Date | null;
  progressPercent: number;
  completedCount: number;
  totalCourses: number;
  activeCourseCount: number;
  lastTrainingActivityAt: Date | null;
  staleTrainingDetectedAt: Date | null;
  partnerName: string | null;
  counselorName: string | null;
  careerPlanSignal: CareerPlanSignal | null;
  /**
   * All program slugs the member is enrolled in (primary + every secondary
   * `course_enrollments` row). The program-filter dropdown matches against
   * this list so multi-program learners surface under non-primary programs.
   */
  programSlugsAll: string[];
};

export type TrainingDashboardData = {
  metrics: TrainingDashboardMetrics;
  rows: TrainingDashboardRow[];
};

const STALE_TRAINING_DAYS = 14;

function isStale(lastTrainingActivityAt: Date | null, enrolledAt: Date | null, staleTrainingDetectedAt: Date | null): boolean {
  if (staleTrainingDetectedAt) return true;
  const baseline = lastTrainingActivityAt ?? enrolledAt;
  if (!baseline) return false;
  return Date.now() - baseline.getTime() > STALE_TRAINING_DAYS * 24 * 60 * 60 * 1000;
}

export async function loadTrainingDashboardData(
  organizationId: string,
): Promise<TrainingDashboardData> {
  const members = await prisma.user.findMany({
    where: trainingDashboardMemberWhere(organizationId),
    orderBy: { enrolledAt: 'desc' },
    take: 3000,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      enrolledProgram: true,
      enrolledAt: true,
      staleTrainingDetectedAt: true,
      careerRecommendationJson: true,
      applications: {
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          status: true,
          submittedAt: true,
          recommendedCareerTitle: true,
          programRankedSlugs: true,
        },
      },
      memberEvents: {
        where: {
          eventName: {
            in: [
              'career_quiz_result_viewed',
              'career_plan_saved',
              'career_plan_commitment_shared',
              'career_plan_application_started',
              'career_plan_training_cta_clicked',
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { eventName: true, createdAt: true, metadata: true },
      },
      memberProgramProgress: {
        select: { programSlug: true, averagePercent: true, coursesCompleted: true, lastUpdatedAt: true },
      },
      // Multi-program-aware: pulled to detect every program a member is
      // enrolled in (the source of truth for multi-program learners), not
      // just the denormalized primary on `User.enrolledProgram`. The
      // program-filter checks against this so secondary enrollees show up
      // when the dashboard is scoped to a non-primary program.
      courseEnrollments: {
        select: { programSlug: true },
      },
      courseProgress: {
        where: { status: { in: [CourseProgressStatus.IN_PROGRESS, CourseProgressStatus.COMPLETED] } },
        take: 50,
        select: { courseSlug: true, status: true, lastUpdatedAt: true },
      },
      partnerReferrals: {
        take: 1,
        orderBy: { referredAt: 'desc' },
        select: { partner: { select: { name: true } } },
      },
      counselorAssignments: {
        where: { active: true },
        take: 1,
        select: { counselor: { select: { user: { select: { fullName: true } } } } },
      },
    },
  });

  const rows: TrainingDashboardRow[] = [];

  for (const m of members) {
    if (!m.enrolledProgram) continue;
    const program = getProgramBySlug(m.enrolledProgram);
    if (!program?.courses.length) continue;

    const progress = computeTrainingProgress(m.enrolledProgram, null, m.memberProgramProgress);
    const matchingRollup = m.memberProgramProgress.find((row) => row.programSlug === m.enrolledProgram) ?? null;
    let lastTrainingActivityAt = matchingRollup?.lastUpdatedAt ?? null;
    for (const row of m.courseProgress) {
      if (!lastTrainingActivityAt || row.lastUpdatedAt > lastTrainingActivityAt) {
        lastTrainingActivityAt = row.lastUpdatedAt;
      }
    }

    // Multi-program-aware: every program slug the learner is in (primary +
    // every secondary `course_enrollments` row). Falls back through
    // `memberProgramProgress` for legacy rows that pre-date enrollments
    // materialisation.
    const programSlugsAll = Array.from(
      new Set<string>([
        m.enrolledProgram,
        ...m.courseEnrollments.map((row) => row.programSlug),
        ...m.memberProgramProgress.map((row) => row.programSlug),
      ]),
    );

    rows.push({
      id: m.id,
      fullName: m.fullName ?? m.email,
      email: m.email,
      phone: m.phone,
      enrolledProgram: m.enrolledProgram,
      programTitle: program.title,
      enrolledAt: m.enrolledAt,
      progressPercent: progress.pct,
      completedCount: progress.completedCount,
      totalCourses: progress.totalCourses,
      activeCourseCount: m.courseProgress.filter((row) => row.status === CourseProgressStatus.IN_PROGRESS).length,
      lastTrainingActivityAt,
      staleTrainingDetectedAt: m.staleTrainingDetectedAt,
      partnerName: m.partnerReferrals[0]?.partner.name ?? null,
      counselorName: m.counselorAssignments[0]?.counselor.user.fullName ?? null,
      careerPlanSignal: deriveCareerPlanSignal({
        careerRecommendationJson: m.careerRecommendationJson,
        applications: m.applications,
        events: m.memberEvents,
        enrolledProgram: m.enrolledProgram,
        activeCourseCount: m.courseProgress.filter((row) => row.status === CourseProgressStatus.IN_PROGRESS).length,
        progressPercent: progress.pct,
      }),
      programSlugsAll,
    });
  }

  const enrolledMembers = rows.length;
  const completed = rows.filter((row) => row.progressPercent >= 100 || row.completedCount >= row.totalCourses).length;
  const notStarted = rows.filter((row) => row.progressPercent <= 0 && row.completedCount === 0 && row.activeCourseCount === 0).length;
  const activeInTraining = rows.filter((row) => row.progressPercent > 0 && row.progressPercent < 100).length;
  const stale = rows.filter((row) => isStale(row.lastTrainingActivityAt, row.enrolledAt, row.staleTrainingDetectedAt)).length;
  const averagePercent = enrolledMembers > 0
    ? Math.round(rows.reduce((sum, row) => sum + row.progressPercent, 0) / enrolledMembers)
    : 0;

  rows.sort((a, b) => {
    const staleA = isStale(a.lastTrainingActivityAt, a.enrolledAt, a.staleTrainingDetectedAt) ? 1 : 0;
    const staleB = isStale(b.lastTrainingActivityAt, b.enrolledAt, b.staleTrainingDetectedAt) ? 1 : 0;
    if (staleA !== staleB) return staleB - staleA;
    if (a.progressPercent !== b.progressPercent) return b.progressPercent - a.progressPercent;
    return (b.lastTrainingActivityAt?.getTime() ?? 0) - (a.lastTrainingActivityAt?.getTime() ?? 0);
  });

  return {
    metrics: { enrolledMembers, activeInTraining, notStarted, completed, stale, averagePercent },
    rows,
  };
}
