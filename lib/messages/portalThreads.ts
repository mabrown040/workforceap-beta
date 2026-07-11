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

export async function assertEmployerCanAccessThread(employerId: string, threadId: string) {
  const thread = await prisma.messageThread.findFirst({
    where: { id: threadId, employerId, kind: 'employer' },
  });
  return thread;
}

export async function assertPartnerCanAccessThread(partnerId: string, threadId: string) {
  const thread = await prisma.messageThread.findFirst({
    where: { id: threadId, partnerId, kind: 'partner' },
  });
  return thread;
}
