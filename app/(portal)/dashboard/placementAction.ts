'use server';

import { prisma } from '@/lib/db/prisma';
import { defaultOnboardingWindowEnd } from '@/lib/placement/defaultOnboardingWindow';
import { getUser } from '@/lib/auth/server';
import { revalidatePath } from 'next/cache';

export async function confirmPlacement(jobApplicationId: string) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  const application = await prisma.jobApplication.findUnique({
    where: { id: jobApplicationId },
  });

  if (!application || application.userId !== user.id) {
    throw new Error('Application not found');
  }

  if (application.status !== 'OFFER') {
    throw new Error('Only offer-stage applications can be confirmed');
  }

  const now = new Date();
  const reviewNote = 'Member self-reported offer acceptance. Counselor review still required.';

  const windowEnd = defaultOnboardingWindowEnd(now);
  await prisma.placementRecord.upsert({
    where: { userId: user.id },
    update: {
      employerName: application.company,
      jobTitle: application.role,
      placedAt: now,
      notes: reviewNote,
      startDateVerified: false,
      onboardingWindowEnd: windowEnd,
    },
    create: {
      userId: user.id,
      employerName: application.company,
      jobTitle: application.role,
      placedAt: now,
      notes: reviewNote,
      startDateVerified: false,
      onboardingWindowEnd: windowEnd,
    },
  });

  await prisma.memberEvent.create({
    data: {
      userId: user.id,
      eventName: 'PLACEMENT_CONFIRMATION_SUBMITTED',
      entityType: 'JobApplication',
      entityId: application.id,
      metadata: {
        company: application.company,
        role: application.role,
        confirmedAt: now.toISOString(),
      },
      sourcePage: '/dashboard',
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/admin');
  revalidatePath(`/admin/members/${user.id}`);
}
