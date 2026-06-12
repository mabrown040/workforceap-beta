import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import {
  resolveRecommendedProgramSlugs,
  resolveRecommendedProgramSummaries,
} from '@/lib/member/recommendPrograms';
import type { CareerMatchResult } from '@/lib/onet/types';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * Member-scoped program recommendations from stored career match JSON,
 * or the top three catalog programs when none exist.
 */
export const GET = withApiGuc(async () => {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const row = await prisma.$transaction((tx) => tx.user.findUnique({
    where: { id: user.id },
    select: { careerRecommendationJson: true },
  }));

  const careerRecommendation = (row?.careerRecommendationJson ?? null) as CareerMatchResult | null;
  const slugs = resolveRecommendedProgramSlugs(careerRecommendation, 3);
  const programs = resolveRecommendedProgramSummaries(careerRecommendation, 3);

  return NextResponse.json({
    recommendedPrograms: programs,
    programSlugs: slugs,
    source: careerRecommendation?.recommendedPrograms?.length ? 'stored' : 'default',
  });
});
