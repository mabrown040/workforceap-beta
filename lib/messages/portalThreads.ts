import { prisma } from '@/lib/db/prisma';

export async function getOrCreateEmployerMessageThread(employerId: string) {
  const existing = await prisma.messageThread.findUnique({
    where: { employerId },
  });
  if (existing) return existing;
  return prisma.messageThread.create({
    data: {
      kind: 'employer',
      employerId,
    },
  });
}

export async function getOrCreatePartnerMessageThread(partnerId: string) {
  const existing = await prisma.messageThread.findUnique({
    where: { partnerId },
  });
  if (existing) return existing;
  return prisma.messageThread.create({
    data: {
      kind: 'partner',
      partnerId,
    },
  });
}

export async function assertEmployerUserCanAccessThread(userId: string, threadId: string) {
  const row = await prisma.employer.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!row) return null;
  const thread = await prisma.messageThread.findFirst({
    where: { id: threadId, employerId: row.id, kind: 'employer' },
  });
  return thread;
}

export async function assertPartnerUserCanAccessThread(userId: string, threadId: string) {
  const pu = await prisma.partnerUser.findUnique({
    where: { userId },
    select: { partnerId: true },
  });
  if (!pu) return null;
  const thread = await prisma.messageThread.findFirst({
    where: { id: threadId, partnerId: pu.partnerId, kind: 'partner' },
  });
  return thread;
}
