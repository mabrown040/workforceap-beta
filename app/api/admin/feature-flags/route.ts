import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { fetchFeatureFlags, validateCreateBody } from '@/lib/feature-flags/adminApi';

import { withApiGuc } from '@/lib/db/withRequestGuc';

async function _GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const flags = await fetchFeatureFlags();
    return NextResponse.json({ flags });
  } catch (error) {
    console.error('[admin/feature-flags GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateCreateBody(body);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const data = validation.data!;
    const existing = await prisma.$transaction((tx) => tx.featureFlag.findUnique({ where: { key: data.key as string } }));
    if (existing) {
      return NextResponse.json({ error: 'Feature flag key already exists' }, { status: 400 });
    }

    const flag = await prisma.$transaction((tx) => tx.featureFlag.create({
      data: data as any,
    }));

    return NextResponse.json({ flag });
  } catch (error) {
    console.error('[admin/feature-flags POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
