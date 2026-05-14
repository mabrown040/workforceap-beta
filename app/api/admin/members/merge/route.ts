import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';
import { executeMemberMerge, buildMergePreview } from '@/lib/admin/memberMerge';

/**
 * Verify that both members in a merge candidate pair belong to the caller's
 * tenant (or that the caller is a super-admin who can act across tenants).
 *
 * Returns true if the merge is allowed, false otherwise. Cross-tenant
 * member ids are masked behind a generic 404 by the caller to prevent
 * id-enumeration.
 */
async function bothMembersInActorScope(
  staffUserId: string,
  primaryId: string,
  secondaryId: string,
): Promise<boolean> {
  if (await isSuperAdmin(staffUserId)) return true;
  let orgId: string;
  try {
    orgId = await getActorOrganizationId(staffUserId);
  } catch {
    return false;
  }
  const count = await prisma.user.count({
    where: { id: { in: [primaryId, secondaryId] }, organizationId: orgId },
  });
  return count === 2;
}

/**
 * GET /api/admin/members/merge?primaryId=...&secondaryId=...
 *
 * Returns a preview of what would happen if the two members were merged.
 */
export async function GET(req: NextRequest) {
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

    // Tenant scope: a non-super tenant admin can only preview merges
    // between members in their own organization. requireAdmin alone is
    // a global role check; without this extra scope a tenant admin who
    // obtains another tenant's user ids could read names, emails, and
    // merge-conflict detail for those members.
    if (!(await bothMembersInActorScope(user.id, primaryId, secondaryId))) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
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

/**
 * POST /api/admin/members/merge
 *
 * Body: { primaryId: string, secondaryId: string }
 *
 * Merges secondary member into primary.
 * Returns: { ok: true, primaryId, secondaryId, repointed: string[], mergedFields: string[] }
 */
export async function POST(req: NextRequest) {
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

    // Same tenant scope as the GET preview — strictly more important here
    // because this is the destructive path. Without scope, a tenant admin
    // who obtained another tenant's user ids could merge those users
    // together, irreversibly corrupting that tenant's data.
    if (!(await bothMembersInActorScope(user.id, primaryId, secondaryId))) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
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
