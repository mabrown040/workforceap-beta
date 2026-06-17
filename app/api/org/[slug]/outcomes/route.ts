import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  generatePartnerQuarterlyOutcomes,
  getDefaultQuarter,
  type QuarterSpec,
} from '@/lib/analytics/partnerQuarterlyOutcomes';

function parseQuarterParam(raw: string | null): QuarterSpec['quarter'] | null {
  if (!raw) return null;
  const q = raw.toUpperCase();
  if (['Q1', 'Q2', 'Q3', 'Q4'].includes(q)) return q as QuarterSpec['quarter'];
  return null;
}

function parseYearParam(raw: string | null): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 2020 || n > 2100) return null;
  return n;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const partner = await prisma.partner.findUnique({
      where: { slug },
      select: { id: true, organizationId: true },
    });
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const quarterParam = parseQuarterParam(searchParams.get('quarter'));
    const yearParam = parseYearParam(searchParams.get('year'));

    const spec: QuarterSpec =
      quarterParam && yearParam
        ? { quarter: quarterParam, year: yearParam }
        : getDefaultQuarter();

    const body = await generatePartnerQuarterlyOutcomes(partner.organizationId, partner.id, spec);

    // Strip membersList from public response for privacy
    const publicBody = {
      ...body,
      membersList: undefined,
    };

    return NextResponse.json(publicBody);
  } catch (error) {
    console.error('/api/org/[slug]/outcomes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
