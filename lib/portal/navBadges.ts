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
    counselor_messages_unread = await prisma.message.count({
      where: {
        threadId: thread.id,
        authorId: { not: userId },
        ...(thread.memberLastReadAt ? { createdAt: { gt: thread.memberLastReadAt } } : {}),
      },
    });
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
    employer_messages_unread = await prisma.message.count({
      where: {
        threadId: thread.id,
        authorId: { not: staffUserId },
        ...(thread.portalUserLastReadAt ? { createdAt: { gt: thread.portalUserLastReadAt } } : {}),
      },
    });
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

  const unreadCounts = await Promise.all(
    threads.map(async (thread) => {
      if (!thread.memberId) return 0;
      return prisma.message.count({
        where: {
          threadId: thread.id,
          authorId: thread.memberId,
          ...(thread.counselorLastReadAt ? { createdAt: { gt: thread.counselorLastReadAt } } : {}),
        },
      });
    })
  );

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
      where: { partnerId, member: { deletedAt: null } },
      select: { memberId: true },
    }),
    prisma.partnerUser.findMany({
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
    partner_messages_unread = await prisma.message.count({
      where: {
        threadId: thread.id,
        authorId: { notIn: partnerUserIds },
        ...(thread.portalUserLastReadAt ? { createdAt: { gt: thread.portalUserLastReadAt } } : {}),
      },
    });
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
