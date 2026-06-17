import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import {
  generateQuarterlyOutcomes,
  getDefaultQuarter,
  type QuarterSpec,
} from '@/lib/analytics/quarterlyOutcomes';
import { withApiGuc } from '@/lib/db/withRequestGuc';

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

export const GET = withApiGuc(async (req: NextRequest) => {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = await getActorOrganizationId(user.id);
    const { searchParams } = new URL(req.url);

    const quarterParam = parseQuarterParam(searchParams.get('quarter'));
    const yearParam = parseYearParam(searchParams.get('year'));

    const spec: QuarterSpec =
      quarterParam && yearParam
        ? { quarter: quarterParam, year: yearParam }
        : getDefaultQuarter();

    const body = await generateQuarterlyOutcomes(orgId, spec);

    return NextResponse.json(body);
  } catch (error) {
    console.error('/admin/reports/quarterly-outcomes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
