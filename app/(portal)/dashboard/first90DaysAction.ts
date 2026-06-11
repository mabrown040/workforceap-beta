'use server';

import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';
import { withUserGuc } from '@/lib/db/withRequestGuc';
import { revalidatePath } from 'next/cache';
import {
  FIRST90_CHECK_IN_EVENT,
  daysSincePlacement,
  getFirst90Stage,
  isFirst90Response,
  isFirst90Stage,
} from '@/lib/member/first90Days';

/**
 * Member submits a First 90 Days check-in from the dashboard card.
 *
 * Persistence reuses the existing generic `MemberEvent` store
 * (eventName = first90_check_in_submitted, entityId = stage) — same
 * pattern as the placement confirmation strip. A "having_trouble"
 * response escalates through the existing `AtRiskAlert` pipeline so it
 * shows up in the counselor inbox-zero queue (`at_risk` flag) without
 * any new infrastructure, plus a CounselorNote for readable context.
 */
export async function submitFirst90DaysCheckIn(stage: string, response: string) {
  if (!isFirst90Stage(stage) || !isFirst90Response(response)) {
    throw new Error('Invalid check-in');
  }

  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  await withUserGuc(user, async () => {
    const placement = await prisma.placementRecord.findUnique({
      where: { userId: user.id },
      select: { id: true, placedAt: true, employerName: true, jobTitle: true },
    });
    if (!placement) throw new Error('No placement on file');

    const currentStage = getFirst90Stage(placement.placedAt);
    if (currentStage !== stage) {
      throw new Error('Check-in stage is no longer active');
    }

    // One response per stage — ignore repeat submissions (e.g. double tap).
    const existing = await prisma.memberEvent.findFirst({
      where: {
        userId: user.id,
        eventName: FIRST90_CHECK_IN_EVENT,
        entityId: stage,
      },
      select: { id: true },
    });
    if (existing) return;

    const days = daysSincePlacement(placement.placedAt);

    await prisma.memberEvent.create({
      data: {
        userId: user.id,
        eventName: FIRST90_CHECK_IN_EVENT,
        entityType: 'PlacementRecord',
        entityId: stage,
        metadata: {
          response,
          stage,
          placementId: placement.id,
          daysSincePlacement: days,
        },
        sourcePage: '/dashboard',
      },
    });

    if (response === 'having_trouble') {
      const troubleSummary = `First 90 Days ${stage.replace('_', ' ')} check-in: member reported having trouble at ${placement.employerName}${placement.jobTitle ? ` (${placement.jobTitle})` : ''}, day ${days} after placement.`;

      // Surface in the counselor inbox via the existing at-risk pipeline
      // (open AtRiskAlert rows drive the `at_risk` inbox flag). Mirrors
      // persistAtRiskAlert in lib/member/atRiskScoring.ts.
      const openAlert = await prisma.atRiskAlert.findFirst({
        where: { userId: user.id, status: { in: ['open', 'acknowledged'] } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, score: true, factors: true },
      });
      const troubleFactor = {
        name: 'first90_trouble_reported',
        weight: 1,
        description: troubleSummary,
      };
      if (openAlert) {
        const factors = Array.isArray(openAlert.factors) ? openAlert.factors : [];
        await prisma.atRiskAlert.update({
          where: { id: openAlert.id },
          data: {
            score: Math.max(openAlert.score, 75),
            factors: [...factors, troubleFactor] as object[],
            status: 'open',
          },
        });
      } else {
        await prisma.atRiskAlert.create({
          data: {
            userId: user.id,
            score: 75,
            factors: [troubleFactor],
            status: 'open',
          },
        });
      }

      // Readable context where counselors already look at member history.
      await prisma.counselorNote.create({
        data: {
          memberId: user.id,
          authorId: user.id,
          content: `[First 90 Days] ${troubleSummary} Reported by the member from the dashboard check-in.`,
        },
      });
    }
  });

  revalidatePath('/dashboard');
}
