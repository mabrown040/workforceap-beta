import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { executeMemberMerge, buildMergePreview } from '@/lib/admin/memberMerge';

import { withApiGuc } from '@/lib/db/withRequestGuc';async function _GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try { await requireAdmin(user.id); } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const primaryId = searchParams.get('primaryId')?.trim() ?? '';
    const secondaryId = searchParams.get('secondaryId')?.trim() ?? '';

    if (!primaryId || !secondaryId || primaryId === secondaryId) {
      return NextResponse.json({ error: 'primaryId and secondaryId required and must differ' }, { status: 400 });
    }

    const preview = await prisma.$transaction(async (tx) => {
      return buildMergePreview(tx, primaryId, secondaryId);
    });

    return NextResponse.json({ ok: true, preview });
  } catch (error) {
    console.error('/admin/members/merge preview error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try { await requireAdmin(user.id); } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({})) as { primaryId?: string; secondaryId?: string };
    const { primaryId, secondaryId } = body;
    if (!primaryId || !secondaryId || primaryId === secondaryId) {
      return NextResponse.json({ error: 'primaryId and secondaryId required and must differ' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      return executeMemberMerge(tx, primaryId, secondaryId, user.id);
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('/admin/members/merge error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
