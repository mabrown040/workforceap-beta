import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { memberProgramCompleted } from '@/lib/partner/memberProgress';

/**
 * Admin Coursera Enrollment Command Center (`/admin/coursera/enrollment`).
 *
 * This module is the single source of truth for the enrollment pipeline
 * rows so the initial server-rendered page and the client-side refresh
 * route (`GET /api/admin/coursera/enrollment-pipeline`) can't drift.
 *
 * Signal precedence (checked top to bottom):
 *   1. `completed`             — lib/partner/memberProgress.ts::memberProgramCompleted
 *      (the canonical "did they finish the program" definition used
 *      elsewhere, e.g. admin subgroup pages). Wins regardless of the
 *      approval flag — a finished program is a finished program.
 *   2. `not_approved`          — courseraEnrollmentApproved is false.
 *   3. `approved_not_started`  — approved, but zero CourseProgress rows,
 *      no `coursera_course_enrolled` audit log entry, and no xAPI
 *      statement from this member's email.
 *   4. `active`                — a CourseProgress row updated, or an xAPI
 *      statement received, in the last 30 days.
 *   5. `stalled`               — started (one of the signals above exists)
 *      but nothing in the last 30+ days.
 *
 * All three underlying signals (CourseProgress, xAPI, audit log) are
 * fetched with a single grouped query each — no per-member queries.
 */

export type EnrollmentSignal = 'not_approved' | 'approved_not_started' | 'active' | 'stalled' | 'completed';

export const ENROLLMENT_SIGNAL_LABELS: Record<EnrollmentSignal, string> = {
  not_approved: 'Not approved',
  approved_not_started: 'Approved — not started',
  active: 'Active',
  stalled: 'Stalled',
  completed: 'Completed',
};

export type EnrollmentPipelineRow = {
  memberId: string;
  memberName: string;
  memberEmail: string;
  programSlug: string;
  programTitle: string;
  approved: boolean;
  approvedAt: string | null;
  approvedByName: string | null;
  signal: EnrollmentSignal;
  lastActivityAt: string | null;
};

export type EnrollmentPipelineSummary = {
  totalMembers: number;
  totalApproved: number;
  approvedNotStarted: number;
  activeLast30Days: number;
  stalled: number;
  completed: number;
  notApproved: number;
};

export type EnrollmentPipelineData = {
  rows: EnrollmentPipelineRow[];
  summary: EnrollmentPipelineSummary;
  programs: Array<{ slug: string; title: string }>;
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function emptySummary(): EnrollmentPipelineSummary {
  return {
    totalMembers: 0,
    totalApproved: 0,
    approvedNotStarted: 0,
    activeLast30Days: 0,
    stalled: 0,
    completed: 0,
    notApproved: 0,
  };
}

export async function loadCourseraEnrollmentPipeline(organizationId: string): Promise<EnrollmentPipelineData> {
  const members = await prisma.user.findMany({
    where: { organizationId, deletedAt: null, enrolledProgram: { not: null } },
    orderBy: [{ fullName: 'asc' }],
    take: 2000,
    select: {
      id: true,
      fullName: true,
      email: true,
      enrolledProgram: true,
      coursesCompleted: true,
      courseraEnrollmentApproved: true,
      courseraEnrollmentApprovedAt: true,
      courseraEnrollmentApprovedById: true,
      memberProgramProgress: {
        select: { programSlug: true, averagePercent: true, coursesCompleted: true },
      },
    },
  });

  if (members.length === 0) {
    return { rows: [], summary: emptySummary(), programs: [] };
  }

  const memberIds = members.map((m) => m.id);
  const approverIds = [...new Set(members.map((m) => m.courseraEnrollmentApprovedById).filter((v): v is string => Boolean(v)))];

  const [courseProgressAgg, xapiAgg, auditAgg, approvers] = await Promise.all([
    prisma.courseProgress.groupBy({
      by: ['userId'],
      where: { userId: { in: memberIds } },
      _count: { _all: true },
      _max: { lastActivityAt: true },
    }),
    prisma.$queryRaw<Array<{ userId: string; count: bigint; lastActivityAt: Date | null }>>`
      SELECT actor_user.id AS "userId", COUNT(*)::bigint AS count, MAX(xs.created_at) AS "lastActivityAt"
      FROM xapi_statements xs
      JOIN users actor_user ON LOWER(actor_user.email) = LOWER(xs.actor_email)
      WHERE actor_user.id = ANY(${memberIds}::text[]) AND actor_user.organization_id = ${organizationId}
      GROUP BY actor_user.id
    `,
    prisma.auditLog.groupBy({
      by: ['targetId'],
      where: { targetType: 'User', targetId: { in: memberIds }, action: 'coursera_course_enrolled' },
      _count: { _all: true },
    }),
    approverIds.length > 0
      ? prisma.user.findMany({ where: { id: { in: approverIds } }, select: { id: true, fullName: true } })
      : Promise.resolve([]),
  ]);

  const courseProgressByUser = new Map(courseProgressAgg.map((r) => [r.userId, r]));
  const xapiByUser = new Map(xapiAgg.map((r) => [r.userId, r]));
  const auditByUser = new Map(auditAgg.map((r) => [r.targetId, r]));
  const approverNameById = new Map(approvers.map((a) => [a.id, a.fullName]));

  const now = Date.now();
  const cutoff = now - THIRTY_DAYS_MS;
  const programSet = new Map<string, string>();

  const rows: EnrollmentPipelineRow[] = members.map((m) => {
    const programSlug = m.enrolledProgram as string;
    const programTitle = getProgramBySlug(programSlug)?.title ?? programSlug;
    programSet.set(programSlug, programTitle);

    const cp = courseProgressByUser.get(m.id);
    const xapi = xapiByUser.get(m.id);
    const audit = auditByUser.get(m.id);

    const courseProgressCount = cp?._count._all ?? 0;
    const xapiCount = Number(xapi?.count ?? 0);
    const auditCount = audit?._count._all ?? 0;

    const lastActivityCandidates = [cp?._max.lastActivityAt ?? null, xapi?.lastActivityAt ?? null].filter(
      (d): d is Date => d != null,
    );
    const lastActivityAt =
      lastActivityCandidates.length > 0
        ? new Date(Math.max(...lastActivityCandidates.map((d) => d.getTime())))
        : null;

    const completed = memberProgramCompleted(programSlug, m.coursesCompleted, m.memberProgramProgress);

    let signal: EnrollmentSignal;
    if (completed) {
      signal = 'completed';
    } else if (!m.courseraEnrollmentApproved) {
      signal = 'not_approved';
    } else {
      const started = courseProgressCount > 0 || xapiCount > 0 || auditCount > 0;
      if (!started) {
        signal = 'approved_not_started';
      } else if (lastActivityAt && lastActivityAt.getTime() >= cutoff) {
        signal = 'active';
      } else {
        signal = 'stalled';
      }
    }

    return {
      memberId: m.id,
      memberName: m.fullName,
      memberEmail: m.email,
      programSlug,
      programTitle,
      approved: m.courseraEnrollmentApproved,
      approvedAt: m.courseraEnrollmentApprovedAt ? m.courseraEnrollmentApprovedAt.toISOString() : null,
      approvedByName: m.courseraEnrollmentApprovedById
        ? (approverNameById.get(m.courseraEnrollmentApprovedById) ?? null)
        : null,
      signal,
      lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
    };
  });

  const summary = rows.reduce<EnrollmentPipelineSummary>((acc, row) => {
    acc.totalMembers += 1;
    if (row.approved) acc.totalApproved += 1;
    if (row.signal === 'not_approved') acc.notApproved += 1;
    if (row.signal === 'approved_not_started') acc.approvedNotStarted += 1;
    if (row.signal === 'active') acc.activeLast30Days += 1;
    if (row.signal === 'stalled') acc.stalled += 1;
    if (row.signal === 'completed') acc.completed += 1;
    return acc;
  }, emptySummary());

  const programs = [...programSet.entries()]
    .map(([slug, title]) => ({ slug, title }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return { rows, summary, programs };
}
