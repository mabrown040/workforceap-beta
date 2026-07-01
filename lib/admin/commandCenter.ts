import 'server-only';

import { ApplicationStatus, JobApplicationStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import {
  buildApplicationEmailPacket,
  bucketCommandCenterTotals,
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
  options?: { perSectionLimit?: number; now?: Date },
): Promise<AdminCommandCenter> {
  const orgId = await getActorOrganizationId(actorUserId);
  const limit = options?.perSectionLimit ?? DEFAULT_LIMIT;
  const now = options?.now ?? new Date();
  const atRiskCutoff = new Date(now.getTime() - AT_RISK_DAYS * DAY_MS);

  const [needsReply, atRisk, interviewing, applicationsPending, programHealth, certificationsPendingCount] =
    await Promise.all([
      loadNeedsReply(orgId, now, limit),
      loadAtRisk(orgId, now, atRiskCutoff, limit),
      loadInterviewing(orgId, limit),
      loadApplicationsPending(orgId, now, limit),
      loadProgramHealth(orgId),
      prisma.userCertification.count({
        where: { status: 'pending', user: { organizationId: orgId, deletedAt: null } },
      }),
    ]);

  const center: AdminCommandCenter = {
    needsReply,
    atRisk,
    interviewing,
    applicationsPending,
    programHealth,
    totals: {
      needsReplyCount: 0,
      atRiskCount: 0,
      interviewingCount: 0,
      applicationsPendingCount: 0,
      certificationsPendingCount: 0,
      oldestPendingApplicationDays: null,
    },
  };
  return { ...center, totals: bucketCommandCenterTotals(center, { certificationsPendingCount }) };
}

async function loadNeedsReply(orgId: string, now: Date, limit: number): Promise<AdminNeedsReplyRow[]> {
  const threads = await prisma.messageThread.findMany({
    take: 500,
    where: {
      kind: 'member',
      memberId: { not: null },
      member: { organizationId: orgId, deletedAt: null },
    },
    select: {
      id: true,
      memberId: true,
      member: { select: { id: true, fullName: true, email: true } },
    },
  });
  if (threads.length === 0) return [];

  const threadIds = threads.map((thread) => thread.id);
  // Last message per thread, ordered oldest-first and capped to `limit`
  // directly in SQL — the "is this thread awaiting a staff reply" filter
  // still has to happen after the join (author vs. thread's member), but we
  // no longer pull all 500 last-messages into JS just to sort/slice them:
  // DISTINCT ON already narrows to one row per thread, and the outer
  // ORDER BY + LIMIT keeps only the oldest `limit` candidates before the
  // cheap in-memory author-match filter runs.
  const lastMessages = await prisma.$queryRawUnsafe<Array<{
    thread_id: string;
    author_id: string;
    body: string | null;
    created_at: Date;
  }>>(
    `SELECT thread_id, author_id, body, created_at FROM (
       SELECT DISTINCT ON (thread_id) thread_id, author_id, body, created_at
       FROM messages
       WHERE thread_id = ANY($1::text[])
       ORDER BY thread_id, created_at DESC
     ) last_per_thread
     ORDER BY created_at ASC
     LIMIT $2`,
    threadIds,
    limit,
  );

  const threadById = new Map(threads.map((thread) => [thread.id, thread]));
  const rows: AdminNeedsReplyRow[] = [];
  for (const message of lastMessages) {
    const thread = threadById.get(message.thread_id);
    if (!thread?.memberId || !thread.member) continue;
    if (message.author_id !== thread.memberId) continue;
    rows.push({
      memberId: thread.member.id,
      memberName: thread.member.fullName ?? thread.member.email,
      memberEmail: thread.member.email,
      threadId: message.thread_id,
      lastMessageBody: message.body,
      lastMessageAt: message.created_at,
      hoursWaiting: Math.max(0, Math.round((now.getTime() - message.created_at.getTime()) / (60 * 60 * 1000))),
    });
  }

  return rows;
}

async function loadAtRisk(
  orgId: string,
  now: Date,
  atRiskCutoff: Date,
  limit: number,
): Promise<AdminAtRiskRow[]> {
  // Same eligibility + days-inactive formula as before (last member event, or
  // enrolledAt if none, floored at AT_RISK_DAYS), but computed and ordered in
  // SQL so only the top `limit` rows come back instead of fetching up to 500
  // candidates and sorting/slicing them in JS.
  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    full_name: string | null;
    email: string;
    enrolled_program: string | null;
    days_inactive: number;
  }>>(
    `SELECT
       u.id,
       u.full_name,
       u.email,
       u.enrolled_program,
       GREATEST(
         $1::int,
         FLOOR(EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(last_event.created_at, u.enrolled_at))) / 86400)
       )::int AS days_inactive
     FROM users u
     LEFT JOIN LATERAL (
       SELECT me.created_at
       FROM member_events me
       WHERE me.user_id = u.id
       ORDER BY me.created_at DESC
       LIMIT 1
     ) last_event ON true
     WHERE u.organization_id = $3
       AND u.deleted_at IS NULL
       AND u.enrolled_program IS NOT NULL
       AND (
         u.stale_training_detected_at IS NOT NULL
         OR NOT EXISTS (
           SELECT 1 FROM member_events me2
           WHERE me2.user_id = u.id AND me2.created_at >= $4::timestamptz
         )
       )
     ORDER BY days_inactive DESC
     LIMIT $5`,
    AT_RISK_DAYS,
    now,
    orgId,
    atRiskCutoff,
    limit,
  );

  return rows.map((row) => ({
    memberId: row.id,
    memberName: row.full_name ?? row.email,
    memberEmail: row.email,
    daysInactive: row.days_inactive,
    enrolledProgram: row.enrolled_program,
  }));
}

async function loadInterviewing(orgId: string, limit: number): Promise<AdminInterviewingRow[]> {
  const rows = await prisma.jobApplication.findMany({
    take: limit,
    where: {
      status: { in: [JobApplicationStatus.PHONE_SCREEN, JobApplicationStatus.INTERVIEWING, JobApplicationStatus.OFFER] },
      user: { organizationId: orgId, deletedAt: null },
    },
    orderBy: [{ nextInterviewDate: 'asc' }, { updatedAt: 'desc' }],
    select: {
      company: true,
      role: true,
      status: true,
      nextInterviewDate: true,
      user: { select: { id: true, fullName: true, email: true } },
    },
  });

  return rows.map((row) => ({
    memberId: row.user.id,
    memberName: row.user.fullName ?? row.user.email,
    memberEmail: row.user.email,
    company: row.company,
    role: row.role,
    statusLabel: jobApplicationStatusLabel(row.status),
    nextInterviewDate: row.nextInterviewDate,
  }));
}

async function loadApplicationsPending(
  orgId: string,
  now: Date,
  limit: number,
): Promise<AdminApplicationPendingRow[]> {
  const rows = await prisma.application.findMany({
    take: limit,
    where: {
      status: { in: [ApplicationStatus.PENDING, ApplicationStatus.NEEDS_INFO] },
      user: { organizationId: orgId, deletedAt: null },
    },
    orderBy: [{ submittedAt: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      status: true,
      programInterest: true,
      recommendedCareerTitle: true,
      submittedAt: true,
      createdAt: true,
      user: { select: { id: true, fullName: true, email: true, phone: true } },
    },
  });

  return rows.map((row) => {
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
  });
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
