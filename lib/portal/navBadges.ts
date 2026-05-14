import { prisma } from '@/lib/db/prisma';
import { getCounselorForUser, getEmployerForUser, getPartnerForUser, isSuperAdmin } from '@/lib/auth/roles';
import { countThreadsWithSlaBreach, getSlaStatusForThreads } from '@/lib/messages/superAdminMessageQueries';
import { countEmployerQueueBadges } from '@/lib/employer/workQueue';
import { buildPartnerAttentionQueue, countActionablePartnerAttention } from '@/lib/partner/attentionQueue';
import type { NavBadgeKey } from '@/lib/nav/portalNav';
import type { PortalRole } from '@/lib/nav/portalNav';

export type NavBadgeCounts = Partial<Record<NavBadgeKey, number>>;

const MILESTONE_LOOKBACK_DAYS = 7;

export async function getNavBadgeCountsForUser(
  role: PortalRole,
  userId: string
): Promise<NavBadgeCounts> {
  if (role === 'admin') {
    if (await isSuperAdmin(userId)) {
      const counselor_sla_breach_48h = await countThreadsWithSlaBreach(48);
      return { counselor_sla_breach_48h };
    }
    return {};
  }

  if (role === 'member' || role === 'group') {
    if (role === 'group') return {};
    return getMemberBadgeCounts(userId);
  }

  if (role === 'employer') {
    const sa = await isSuperAdmin(userId);
    const ctx = await getEmployerForUser(userId, { isSuperAdminHint: sa });
    if (!ctx) return {};
    return getEmployerBadgeCounts(ctx.employerId);
  }

  if (role === 'partner') {
    const sa = await isSuperAdmin(userId);
    const ctx = await getPartnerForUser(userId, { isSuperAdminHint: sa });
    if (!ctx) return {};
    return getPartnerBadgeCounts(ctx.partnerId);
  }

  if (role === 'counselor') {
    const [sa, ctx] = await Promise.all([isSuperAdmin(userId), getCounselorForUser(userId)]);
    if (ctx) {
      return getCounselorBadgeCounts(ctx.counselorId);
    }
    if (sa) {
      const counselor_sla_breach_48h = await countThreadsWithSlaBreach(48);
      return { counselor_sla_breach_48h };
    }
    return {};
  }

  return {};
}

async function getMemberBadgeCounts(userId: string): Promise<NavBadgeCounts> {
  const [pendingJobApps, thread] = await Promise.all([
    prisma.jobPostingApplication.count({
      where: { studentId: userId, status: 'pending' },
    }),
    prisma.messageThread.findUnique({
      where: { memberId: userId },
      select: { id: true, memberLastReadAt: true },
    }),
  ]);

  let counselor_messages_unread = 0;
  if (thread) {
    // If memberLastReadAt is null, the member hasn't explicitly read the thread.
    // Counting every message as unread inflates the badge and undermines trust.
    counselor_messages_unread = thread.memberLastReadAt
      ? await prisma.message.count({
          where: {
            threadId: thread.id,
            authorId: { not: userId },
            createdAt: { gt: thread.memberLastReadAt },
          },
        })
      : 0;
  }

  return {
    // Career readiness is counselor-maintained; incomplete checklist items are not member action items.
    applications_new: pendingJobApps,
    counselor_messages_unread,
  };
}

async function getEmployerBadgeCounts(employerId: string): Promise<NavBadgeCounts> {
  const [draft, pendingReview, live, newApplications, queueBadges, employerRow, thread] = await Promise.all([
    prisma.job.count({ where: { employerId, status: 'draft' } }),
    prisma.job.count({
      where: { employerId, status: { in: ['pending', 'approved'] } },
    }),
    prisma.job.count({ where: { employerId, status: 'live' } }),
    prisma.jobPostingApplication.count({
      where: {
        job: { employerId },
        status: 'pending',
      },
    }),
    countEmployerQueueBadges(employerId),
    prisma.employer.findUnique({
      where: { id: employerId },
      select: { userId: true },
    }),
    prisma.messageThread.findUnique({
      where: { employerId },
      select: { id: true, portalUserLastReadAt: true },
    }),
  ]);

  let employer_messages_unread = 0;
  if (thread && employerRow) {
    const staffUserId = employerRow.userId;
    employer_messages_unread = thread.portalUserLastReadAt
      ? await prisma.message.count({
          where: {
            threadId: thread.id,
            authorId: { not: staffUserId },
            createdAt: { gt: thread.portalUserLastReadAt },
          },
        })
      : 0;
  }

  return {
    jobs_draft: draft,
    jobs_pending: pendingReview,
    jobs_live: live,
    applications_new: newApplications,
    employer_messages_unread,
    ...queueBadges,
  };
}

async function getCounselorBadgeCounts(counselorId: string): Promise<NavBadgeCounts> {
  const assignments = await prisma.counselorAssignment.findMany({
    take: 500,
    where: {
      counselorId,
      active: true,
      member: { deletedAt: null },
    },
    select: { memberId: true },
  });

  const memberIds = assignments.map((assignment) => assignment.memberId);
  if (memberIds.length === 0) return {};

  const threads = await prisma.messageThread.findMany({
    take: 500,
    where: {
      kind: 'member',
      memberId: { in: memberIds },
    },
    select: {
      id: true,
      memberId: true,
      counselorLastReadAt: true,
    },
  });

  if (threads.length === 0) return {};

  // Batch unread counts into a single SQL query (eliminates N message.count calls).
  const threadIds = threads.map((t) => t.id);
  const unreadRows = await prisma.$queryRawUnsafe<
    Array<{ threadId: string; count: bigint }>
  >(
    `SELECT m.thread_id as "threadId", COUNT(*) as count
     FROM messages m
     JOIN message_threads t ON m.thread_id = t.id
     WHERE m.thread_id = ANY($1)
       AND m.author_id = t.member_id
       AND t.counselor_last_read_at IS NOT NULL
       AND m.created_at > t.counselor_last_read_at
     GROUP BY m.thread_id`,
    threadIds,
  );
  const unreadMap = new Map<string, bigint>();
  for (const row of unreadRows) {
    unreadMap.set(row.threadId, row.count);
  }
  const unreadCounts = threads.map((t) => Number(unreadMap.get(t.id) ?? 0));

  const slaRows = await getSlaStatusForThreads(threads.map((thread) => thread.id));
  let counselor_sla_breach_48h = 0;
  for (const thread of threads) {
    if (slaRows.get(thread.id)?.breached48h) counselor_sla_breach_48h += 1;
  }

  return {
    counselor_messages_unread: unreadCounts.reduce((sum, count) => sum + count, 0),
    counselor_sla_breach_48h,
  };
}

async function getPartnerBadgeCounts(partnerId: string): Promise<NavBadgeCounts> {
  const since = new Date();
  since.setDate(since.getDate() - MILESTONE_LOOKBACK_DAYS);

  const [attentionRows, referralIds, partnerUsers, thread] = await Promise.all([
    buildPartnerAttentionQueue(partnerId),
    prisma.partnerReferral.findMany({
      take: 500,
      where: { partnerId, member: { deletedAt: null } },
      select: { memberId: true },
    }),
    prisma.partnerUser.findMany({
      take: 500,
      where: { partnerId },
      select: { userId: true },
    }),
    prisma.messageThread.findUnique({
      where: { partnerId },
      select: { id: true, portalUserLastReadAt: true },
    }),
  ]);

  const memberIds = referralIds.map((r) => r.memberId);
  let milestonesNew = 0;
  if (memberIds.length > 0) {
    milestonesNew = await prisma.memberEvent.count({
      where: {
        userId: { in: memberIds },
        createdAt: { gte: since },
      },
    });
  }

  const partnerUserIds = partnerUsers.map((p) => p.userId);
  let partner_messages_unread = 0;
  if (thread && partnerUserIds.length > 0) {
    partner_messages_unread = thread.portalUserLastReadAt
      ? await prisma.message.count({
          where: {
            threadId: thread.id,
            authorId: { notIn: partnerUserIds },
            createdAt: { gt: thread.portalUserLastReadAt },
          },
        })
      : 0;
  }

  return {
    partner_needs_attention: countActionablePartnerAttention(attentionRows),
    milestones_new: milestonesNew,
    partner_messages_unread,
  };
}

export function isValidPortalBadgeRole(r: string): r is PortalRole {
  return ['member', 'employer', 'partner', 'admin', 'group', 'counselor'].includes(r);
}
