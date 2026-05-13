import { prisma } from '@/lib/db/prisma';

async function completeCareerOsActionsForMember(where: {
  memberId: string;
  ctaHref?: string;
  ctaHrefStartsWith?: string;
}) {
  const actions = await prisma.memberNextBestAction.findMany({
    take: 5000,
    where: {
      memberId: where.memberId,
      status: 'PENDING',
      icon: 'auto_awesome',
      ...(where.ctaHref ? { ctaHref: where.ctaHref } : {}),
      ...(where.ctaHrefStartsWith ? { ctaHref: { startsWith: where.ctaHrefStartsWith } } : {}),
    },
    select: { id: true },
  });

  if (actions.length === 0) return { completedCount: 0, actionIds: [] as string[] };

  await prisma.memberNextBestAction.updateMany({
    where: { id: { in: actions.map((action) => action.id) } },
    data: { status: 'COMPLETED' },
  });

  return {
    completedCount: actions.length,
    actionIds: actions.map((action) => action.id),
  };
}

export async function completeCareerOsResumeActions(memberId: string) {
  return completeCareerOsActionsForMember({
    memberId,
    ctaHref: '/dashboard/resume',
  });
}

export async function completeCareerOsInterviewActions(memberId: string) {
  return completeCareerOsActionsForMember({
    memberId,
    ctaHrefStartsWith: '/dashboard/ai-tools/interview-practice',
  });
}
