import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

const STATIC_SOURCES = [
  'Google / Web Search',
  'Social Media (Facebook, Instagram, LinkedIn)',
  'Friend or Family',
  'Flyer or Brochure',
  'WorkforceAP Counselor',
  'Other',
];

export async function GET() {
  try {
    const partners = await prisma.partner.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { name: true },
    });
    const partnerNames = partners.map((p) => p.name);
    // Partners first, then static sources
    return NextResponse.json([...partnerNames, ...STATIC_SOURCES], {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    // Fallback to static list if DB is unavailable
    return NextResponse.json(STATIC_SOURCES);
  }
}