import { prisma } from '@/lib/db/prisma';
import { getEmployerForUser, getPartnerForUser } from '@/lib/auth/roles';
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
  if (role === 'admin') return {};

  if (role === 'member' || role === 'group') {
    if (role === 'group') return {};
    return getMemberBadgeCounts(userId);
  }

  if (role === 'employer') {
    const ctx = await getEmployerForUser(userId);
    if (!ctx) return {};
    return getEmployerBadgeCounts(ctx.employerId);
  }

  if (role === 'partner') {
    const ctx = await getPartnerForUser(userId);
    if (!ctx) return {};
    return getPartnerBadgeCounts(ctx.partnerId);
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
  const [draft, pendingReview, live, newApplications, queueBadges] = await Promise.all([
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
  ]);

  return {
    jobs_draft: draft,
    jobs_pending: pendingReview,
    jobs_live: live,
    applications_new: newApplications,
    ...queueBadges,
  };
}

async function getPartnerBadgeCounts(partnerId: string): Promise<NavBadgeCounts> {
  const since = new Date();
  since.setDate(since.getDate() - MILESTONE_LOOKBACK_DAYS);

  const [attentionRows, referralIds] = await Promise.all([
    buildPartnerAttentionQueue(partnerId),
    prisma.partnerReferral.findMany({
      where: { partnerId, member: { deletedAt: null } },
      select: { memberId: true },
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

  return {
    partner_needs_attention: countActionablePartnerAttention(attentionRows),
    milestones_new: milestonesNew,
  };
}

export function isValidPortalBadgeRole(r: string): r is PortalRole {
  return ['member', 'employer', 'partner', 'admin', 'group'].includes(r);
}
