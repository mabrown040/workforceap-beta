import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { FALLBACK_REFERRAL_SOURCES, PUBLIC_REFERRAL_SOURCE_OPTIONS } from '@/lib/referralSources';
import { isExcludedPublicPartnerName } from '@/lib/public/publicDataFilters';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const STATIC_SOURCES = [...PUBLIC_REFERRAL_SOURCE_OPTIONS];export const GET = withApiGuc(async () => {
  try {
    const partners = await prisma.$transaction((tx) => tx.partner.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { name: true },
      take: 100,
    }));
    const partnerNames = partners
      .map((p) => p.name)
      .filter((name) => !isExcludedPublicPartnerName(name));
    // Partners first, then static sources
    return NextResponse.json([...partnerNames, ...STATIC_SOURCES], {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json([...FALLBACK_REFERRAL_SOURCES], {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  }
});
