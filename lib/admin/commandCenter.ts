import 'server-only';

import { ApplicationStatus, JobApplicationStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import {
  buildApplicationEmailPacket,
  normalizeAdminQueueRequest,
  type AdminQueueKey,
  type AdminApplicationPendingRow,
  type AdminAtRiskRow,
  type AdminCommandCenter,
  type AdminInterviewingRow,
  type AdminNeedsReplyRow,
  type AdminProgramHealthRow,
} from '@/lib/admin/commandCenterHelpers';

export { buildApplicationEmailPacket, bucketCommandCenterTotals } from '@/lib/admin/commandCenterHelpers';
export type {
  AdminApplicationPendingRow,
  AdminAtRiskRow,
  AdminCommandCenter,
  AdminCommandCenterBaseRow,
  AdminCommandCenterTotals,
  AdminInterviewingRow,
  AdminNeedsReplyRow,
  AdminProgramHealthRow,
  ApplicationEmailPacket,
} from '@/lib/admin/commandCenterHelpers';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 8;
const AT_RISK_DAYS = 14;
const PROGRAM_HEALTH_LIMIT = 5;

export async function getAdminCommandCenter(
  actorUserId: string,
  options?: { perSectionLimit?: number; now?: Date; queue?: AdminQueueKey; page?: number },
): Promise<AdminCommandCenter> {
  const orgId = await getActorOrganizationId(actorUserId);
  const { queue, page } = normalizeAdminQueueRequest(options?.queue, options?.page);
  const limit = queue ? 25 : Math.max(1, Math.min(50, Math.floor(options?.perSectionLimit || DEFAULT_LIMIT)));
  const offset = (page - 1) * limit;
  const skipFor = (key: AdminQueueKey) => queue === key ? offset : 0;
  const now = options?.now ?? new Date();
  const atRiskCutoff = new Date(now.getTime() - AT_RISK_DAYS * DAY_MS);

  const [needsReply, atRisk, interviewing, applicationsPending, programHealth, certificationsPendingCount] =
    await Promise.all([
      loadNeedsReply(orgId, now, limit, skipFor('needs-reply')),
      loadAtRisk(orgId, now, atRiskCutoff, limit, skipFor('at-risk')),
      loadInterviewing(orgId, limit, skipFor('interviewing')),
      loadApplicationsPending(orgId, now, limit, skipFor('applications')),
      loadProgramHealth(orgId),
      prisma.userCertification.count({
        where: { status: 'pending', user: { organizationId: orgId, deletedAt: null } },
      }),
    ]);

  return {
    needsReply: needsReply.rows,
    atRisk: atRisk.rows,
    interviewing: interviewing.rows,
    applicationsPending: applicationsPending.rows,
    programHealth,
    pagination: queue ? { queue, page, pageSize: limit } : undefined,
    totals: {
      needsReplyCount: needsReply.total,
      atRiskCount: atRisk.total,
      interviewingCount: interviewing.total,
      applicationsPendingCount: applicationsPending.total,
      certificationsPendingCount,
      oldestPendingApplicationDays: applicationsPending.oldestDays,
    },
  };
}

// Count and page use the same filtered relation in one database snapshot. The
// aggregate still returns a total when the requested page is empty.
async function readQueue<T>(query: Prisma.Sql, order: Prisma.Sql, limit: number, offset: number) {
  const [result] = await prisma.$queryRaw<Array<{ total: number; rows: T[] }>>(Prisma.sql`
    WITH queue AS (${query})
    SELECT (SELECT COUNT(*)::int FROM queue) AS total,
      COALESCE((SELECT jsonb_agg(to_jsonb(page_rows)) FROM (
        SELECT * FROM queue ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}
      ) page_rows), '[]'::jsonb) AS rows
  `);
  return result ?? { total: 0, rows: [] };
}

async function loadNeedsReply(orgId: string, now: Date, limit: number, offset: number) {
  const result = await readQueue<{
    id: string; full_name: string | null; email: string;
    thread_id: string; body: string | null; created_at: string;
  }>(Prisma.sql`
    SELECT u.id, u.full_name, u.email, t.id AS thread_id, latest.body, latest.created_at
    FROM message_threads t
    JOIN users u ON u.id = t.member_id
    JOIN LATERAL (
      SELECT m.author_id, m.body, m.created_at FROM messages m
      WHERE m.thread_id = t.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1
    ) latest ON latest.author_id = t.member_id
    WHERE t.kind = 'member' AND u.organization_id = ${orgId} AND u.deleted_at IS NULL
  `, Prisma.sql`created_at ASC, thread_id ASC`, limit, offset);
  return { total: result.total, rows: result.rows.map((row): AdminNeedsReplyRow => ({
    memberId: row.id, memberName: row.full_name ?? row.email, memberEmail: row.email,
    threadId: row.thread_id, lastMessageBody: row.body, lastMessageAt: new Date(row.created_at),
    hoursWaiting: Math.max(0, Math.floor((now.getTime() - new Date(row.created_at).getTime()) / 3600000)),
  })) };
}

async function loadAtRisk(orgId: string, now: Date, atRiskCutoff: Date, limit: number, offset: number) {
  const result = await readQueue<{
    id: string; full_name: string | null; email: string; enrolled_program: string;
    days_inactive: number; stale_training: boolean;
  }>(Prisma.sql`
    SELECT u.id, u.full_name, u.email, u.enrolled_program,
      u.stale_training_detected_at IS NOT NULL AS stale_training,
      GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (${now}::timestamptz -
        COALESCE(last_event.created_at, u.enrolled_at, u.created_at))) / 86400)::int) AS days_inactive
    FROM users u
    LEFT JOIN LATERAL (
      SELECT me.created_at FROM member_events me WHERE me.user_id = u.id
      ORDER BY me.created_at DESC LIMIT 1
    ) last_event ON true
    WHERE u.organization_id = ${orgId} AND u.deleted_at IS NULL AND u.enrolled_program IS NOT NULL
      AND (
        u.stale_training_detected_at IS NOT NULL
        OR (
          (u.coursera_enrollment_approved OR EXISTS (
            SELECT 1 FROM member_program_progress mp WHERE mp.user_id = u.id
              AND mp.program_slug = u.enrolled_program AND (mp.courses_completed > 0 OR mp.average_percent > 0)
          ))
          AND COALESCE(last_event.created_at, u.enrolled_at, u.created_at) <= ${atRiskCutoff}::timestamptz
        )
      )
  `, Prisma.sql`days_inactive DESC, id ASC`, limit, offset);
  return { total: result.total, rows: result.rows.map((row): AdminAtRiskRow => ({
    memberId: row.id, memberName: row.full_name ?? row.email, memberEmail: row.email,
    daysInactive: row.days_inactive, enrolledProgram: row.enrolled_program,
    reason: row.stale_training ? 'Training activity flagged for follow-up' : 'No recent portal activity',
  })) };
}

async function loadInterviewing(orgId: string, limit: number, offset: number) {
  const where: Prisma.JobApplicationWhereInput = {
    status: { in: [JobApplicationStatus.PHONE_SCREEN, JobApplicationStatus.INTERVIEWING, JobApplicationStatus.OFFER] },
    user: { organizationId: orgId, deletedAt: null },
  };
  const [rows, total] = await prisma.$transaction([prisma.jobApplication.findMany({
    take: limit, skip: offset, where,
    orderBy: [{ nextInterviewDate: 'asc' }, { updatedAt: 'desc' }, { id: 'asc' }],
    select: {
      company: true,
      role: true,
      status: true,
      nextInterviewDate: true,
      user: { select: { id: true, fullName: true, email: true } },
    },
  }), prisma.jobApplication.count({ where })], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

  return { total, rows: rows.map((row): AdminInterviewingRow => ({
    memberId: row.user.id,
    memberName: row.user.fullName ?? row.user.email,
    memberEmail: row.user.email,
    company: row.company,
    role: row.role,
    statusLabel: jobApplicationStatusLabel(row.status),
    nextInterviewDate: row.nextInterviewDate,
  })) };
}

async function loadApplicationsPending(
  orgId: string,
  now: Date,
  limit: number,
  offset: number,
) {
  const where: Prisma.ApplicationWhereInput = {
    status: { in: [ApplicationStatus.PENDING, ApplicationStatus.NEEDS_INFO] },
    user: { organizationId: orgId, deletedAt: null },
  };
  const [rows, total, oldest] = await prisma.$transaction([prisma.application.findMany({
    take: limit, skip: offset, where,
    orderBy: [{ submittedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      status: true,
      programInterest: true,
      recommendedCareerTitle: true,
      submittedAt: true,
      createdAt: true,
      user: { select: { id: true, fullName: true, email: true, phone: true } },
    },
  }), prisma.application.count({ where }), prisma.$queryRaw<Array<{ oldest: Date | null }>>(Prisma.sql`
    SELECT MIN(COALESCE(a.submitted_at, a.created_at)) AS oldest FROM applications a
    JOIN users u ON u.id = a.user_id
    WHERE u.organization_id = ${orgId} AND u.deleted_at IS NULL AND a.status IN ('PENDING', 'NEEDS_INFO')
  `)],
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

  return { total, oldestDays: oldest[0]?.oldest ? Math.max(0, Math.floor((now.getTime() - oldest[0]?.oldest.getTime()) / DAY_MS)) : null,
    rows: rows.map((row): AdminApplicationPendingRow => {
    const submittedAt = row.submittedAt ?? row.createdAt;
    const submittedDaysAgo = submittedAt ? Math.max(0, Math.floor((now.getTime() - submittedAt.getTime()) / DAY_MS)) : null;
    const programLabel = getProgramBySlug(row.programInterest)?.title ?? row.programInterest;
    const memberName = row.user.fullName ?? row.user.email;
    return {
      applicationId: row.id,
      memberId: row.user.id,
      memberName,
      memberEmail: row.user.email,
      phone: row.user.phone,
      programLabel,
      status: row.status as 'PENDING' | 'NEEDS_INFO',
      statusLabel: row.status === ApplicationStatus.NEEDS_INFO ? 'Needs more info' : 'Waiting for review',
      submittedAt,
      submittedDaysAgo,
      recommendedCareerTitle: row.recommendedCareerTitle,
      emailPacket: buildApplicationEmailPacket({
        applicantName: memberName,
        applicantEmail: row.user.email,
        programLabel,
        submittedDaysAgo,
        recommendedCareerTitle: row.recommendedCareerTitle,
      }),
    };
  }) };
}

/**
 * Per-program enrollment counts for the "Program Health" breakdown, scoped to
 * the org. Cheap single groupBy over enrolled, non-deleted members. Slugs are
 * resolved to catalog titles, sorted by count desc, and the top programs are
 * returned. `pct` is the share relative to the top program's count so the bars
 * render proportionally (the leading program is always full-width).
 */
async function loadProgramHealth(orgId: string): Promise<AdminProgramHealthRow[]> {
  const grouped = await prisma.user.groupBy({
    by: ['enrolledProgram'],
    where: {
      organizationId: orgId,
      deletedAt: null,
      enrolledProgram: { not: null },
    },
    _count: true,
  });

  const rows = grouped
    .map((group) => {
      const slug = group.enrolledProgram;
      if (!slug) return null;
      return {
        programSlug: slug,
        label: getProgramBySlug(slug)?.title ?? slug,
        count: group._count,
      };
    })
    .filter((row): row is { programSlug: string; label: string; count: number } => row != null)
    .sort((a, b) => b.count - a.count)
    .slice(0, PROGRAM_HEALTH_LIMIT);

  const topCount = rows[0]?.count ?? 0;

  return rows.map((row) => ({
    ...row,
    pct: topCount > 0 ? Math.round((row.count / topCount) * 100) : 0,
  }));
}

function jobApplicationStatusLabel(status: JobApplicationStatus): string {
  if (status === JobApplicationStatus.PHONE_SCREEN) return 'Phone screen';
  if (status === JobApplicationStatus.OFFER) return 'Offer out';
  return 'Interviewing';
}
