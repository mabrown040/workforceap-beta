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
  ApplicationEmailPacket,
} from '@/lib/admin/commandCenterHelpers';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 8;
const AT_RISK_DAYS = 14;

export async function getAdminCommandCenter(
  actorUserId: string,
  options?: { perSectionLimit?: number; now?: Date },
): Promise<AdminCommandCenter> {
  const orgId = await getActorOrganizationId(actorUserId);
  const limit = options?.perSectionLimit ?? DEFAULT_LIMIT;
  const now = options?.now ?? new Date();
  const atRiskCutoff = new Date(now.getTime() - AT_RISK_DAYS * DAY_MS);

  const [needsReply, atRisk, interviewing, applicationsPending] = await Promise.all([
    loadNeedsReply(orgId, now, limit),
    loadAtRisk(orgId, now, atRiskCutoff, limit),
    loadInterviewing(orgId, limit),
    loadApplicationsPending(orgId, now, limit),
  ]);

  const center: AdminCommandCenter = {
    needsReply,
    atRisk,
    interviewing,
    applicationsPending,
    totals: {
      needsReplyCount: 0,
      atRiskCount: 0,
      interviewingCount: 0,
      applicationsPendingCount: 0,
      oldestPendingApplicationDays: null,
    },
  };
  return { ...center, totals: bucketCommandCenterTotals(center) };
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
  const lastMessages = await prisma.$queryRawUnsafe<Array<{
    thread_id: string;
    author_id: string;
    body: string | null;
    created_at: Date;
  }>>(
    `SELECT DISTINCT ON (thread_id) thread_id, author_id, body, created_at
     FROM messages
     WHERE thread_id = ANY($1::text[])
     ORDER BY thread_id, created_at DESC`,
    threadIds,
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

  return rows.sort((a, b) => a.lastMessageAt.getTime() - b.lastMessageAt.getTime()).slice(0, limit);
}

async function loadAtRisk(
  orgId: string,
  now: Date,
  atRiskCutoff: Date,
  limit: number,
): Promise<AdminAtRiskRow[]> {
  const members = await prisma.user.findMany({
    take: 500,
    where: {
      organizationId: orgId,
      deletedAt: null,
      enrolledProgram: { not: null },
      OR: [
        { staleTrainingDetectedAt: { not: null } },
        { memberEvents: { none: { createdAt: { gte: atRiskCutoff } } } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      enrolledProgram: true,
      enrolledAt: true,
      memberEvents: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  return members
    .map((member) => {
      const lastActiveAt = member.memberEvents[0]?.createdAt ?? member.enrolledAt;
      const daysInactive = lastActiveAt
        ? Math.max(AT_RISK_DAYS, Math.floor((now.getTime() - lastActiveAt.getTime()) / DAY_MS))
        : AT_RISK_DAYS;
      return {
        memberId: member.id,
        memberName: member.fullName ?? member.email,
        memberEmail: member.email,
        daysInactive,
        enrolledProgram: member.enrolledProgram,
      };
    })
    .sort((a, b) => b.daysInactive - a.daysInactive)
    .slice(0, limit);
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

function jobApplicationStatusLabel(status: JobApplicationStatus): string {
  if (status === JobApplicationStatus.PHONE_SCREEN) return 'Phone screen';
  if (status === JobApplicationStatus.OFFER) return 'Offer out';
  return 'Interviewing';
}
