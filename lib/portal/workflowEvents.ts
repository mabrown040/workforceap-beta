import { prisma } from '@/lib/db/prisma';

export async function recordEmployerWorkflowEvent(input: {
  employerId: string;
  actorUserId: string;
  kind: string;
  headline: string;
  detail?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}) {
  await prisma.portalWorkflowEvent.create({
    data: {
      scope: 'employer',
      employerId: input.employerId,
      actorUserId: input.actorUserId,
      kind: input.kind,
      headline: input.headline,
      detail: input.detail ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    },
  });
}

export async function recordPartnerWorkflowEvent(input: {
  partnerId: string;
  actorUserId: string;
  kind: string;
  headline: string;
  detail?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}) {
  await prisma.portalWorkflowEvent.create({
    data: {
      scope: 'partner',
      partnerId: input.partnerId,
      actorUserId: input.actorUserId,
      kind: input.kind,
      headline: input.headline,
      detail: input.detail ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    },
  });
}

export async function listEmployerWorkflowEvents(employerId: string, take = 35) {
  return prisma.portalWorkflowEvent.findMany({
    where: { employerId },
    orderBy: { createdAt: 'desc' },
    take,
    include: { actor: { select: { fullName: true, email: true } } },
  });
}

export async function listPartnerWorkflowEvents(partnerId: string, take = 35) {
  return prisma.portalWorkflowEvent.findMany({
    where: { partnerId },
    orderBy: { createdAt: 'desc' },
    take,
    include: { actor: { select: { fullName: true, email: true } } },
  });
}
