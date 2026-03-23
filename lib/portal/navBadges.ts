import { prisma } from '@/lib/db/prisma';
import { getEmployerForUser, getPartnerForUser } from '@/lib/auth/roles';
import { getPipelineStage, type PipelineStudent } from '@/lib/pipeline/stage';
import type { NavBadgeKey } from '@/lib/nav/portalNav';
import type { PortalRole } from '@/lib/nav/portalNav';

export type NavBadgeCounts = Partial<Record<NavBadgeKey, number>>;

const STALE_DAYS = 7;

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
  const [incompleteReadiness, pendingJobApps] = await Promise.all([
    prisma.readinessChecklist.count({
      where: { userId, completed: false },
    }),
    prisma.jobPostingApplication.count({
      where: { studentId: userId, status: 'pending' },
    }),
  ]);

  return {
    readiness_incomplete: incompleteReadiness,
    applications_new: pendingJobApps,
  };
}

async function getEmployerBadgeCounts(employerId: string): Promise<NavBadgeCounts> {
  const [draft, pendingReview, live, newApplications] = await Promise.all([
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
  ]);

  return {
    jobs_draft: draft,
    jobs_pending: pendingReview,
    jobs_live: live,
    applications_new: newApplications,
  };
}

async function getPartnerBadgeCounts(partnerId: string): Promise<NavBadgeCounts> {
  const since = new Date();
  since.setDate(since.getDate() - STALE_DAYS);

  const referrals = await prisma.partnerReferral.findMany({
    where: { partnerId, member: { deletedAt: null } },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          enrolledProgram: true,
          enrolledAt: true,
          coursesCompleted: true,
          updatedAt: true,
          deletedAt: true,
          assessmentCompleted: true,
          placementRecord: {
            select: { employerName: true, jobTitle: true, salaryOffered: true, placedAt: true },
          },
          userCertifications: { select: { certName: true, earnedAt: true } },
          applications: { select: { status: true, submittedAt: true } },
        },
      },
    },
  });

  let needsAttention = 0;
  for (const r of referrals) {
    const m = r.member;
    const student: PipelineStudent = {
      id: m.id,
      fullName: m.fullName,
      email: '',
      enrolledProgram: m.enrolledProgram,
      enrolledAt: m.enrolledAt,
      assessmentCompleted: m.assessmentCompleted,
      coursesCompleted: m.coursesCompleted,
      deletedAt: m.deletedAt,
      placementRecord: m.placementRecord,
      userCertifications: m.userCertifications,
      applications: m.applications,
    };
    const stage = getPipelineStage(student);
    if (stage !== 'applied' && stage !== 'enrolled') continue;
    if (m.updatedAt >= since) continue;
    needsAttention += 1;
  }

  const memberIds = referrals.map((r) => r.member.id);
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
    partner_needs_attention: needsAttention,
    milestones_new: milestonesNew,
  };
}

export function isValidPortalBadgeRole(r: string): r is PortalRole {
  return ['member', 'employer', 'partner', 'admin', 'group'].includes(r);
}
