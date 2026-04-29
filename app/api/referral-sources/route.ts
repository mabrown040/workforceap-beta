import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { FALLBACK_REFERRAL_SOURCES } from '@/lib/referralSources';
import { isExcludedPublicPartnerName } from '@/lib/public/publicDataFilters';
import { checkPublicCareersGetRateLimit } from '@/lib/rate-limit';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

const STATIC_SOURCES = [
  'Google / Web Search',
  'Social Media (Facebook, Instagram, LinkedIn)',
  'Friend or Family',
  'Flyer or Brochure',
  'WorkforceAP Counselor',
  'Other',
];

export async function GET(request: NextRequest) {
  // Rate limiting to prevent abuse of this cached data endpoint
  const ip = getClientIp(request);
  const { success: rateOk } = await checkPublicCareersGetRateLimit(ip);
  if (!rateOk) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down and try again.' },
      { status: 429 }
    );
  }

  try {
    const partners = await prisma.partner.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { name: true },
    });
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
}
