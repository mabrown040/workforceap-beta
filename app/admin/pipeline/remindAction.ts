'use server';

import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { revalidatePath } from 'next/cache';
import { sendApplicantFollowupEmail } from '@/lib/email';

export async function remindStaleApplication(applicationId: string, userId: string) {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) throw new Error('Unauthorized');

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  if (!application || application.userId !== userId) {
    throw new Error('Application not found');
  }

  if (application.status !== 'PENDING') {
    throw new Error('Application is no longer pending');
  }

  const emailResult = await sendApplicantFollowupEmail({
    to: application.user.email,
    fullName: application.user.fullName ?? 'there',
    expectedDate: 'within the next 2 business days',
  });

  await prisma.memberEvent.create({
    data: {
      userId,
      eventName: 'APPLICATION_REMINDER_SENT',
      entityType: 'Application',
      entityId: applicationId,
      metadata: {
        note: 'System sent a reminder for a stale application.',
        emailOk: emailResult.ok,
        emailError: emailResult.error ?? null,
      },
      sourcePage: '/admin/pipeline',
    },
  });

  revalidatePath('/admin/pipeline');
  revalidatePath('/admin');
}
