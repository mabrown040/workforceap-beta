import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withTenantScope, crossTenantOK } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';

/**
 * Restore a soft-deleted user. Clears `deletedAt` and, if the email
 * was rewritten to the sentinel form by the delete route or the
 * "free email" admin action, restores the original email if it isn't
 * currently colliding with another user.
 *
 * NOTE: this does NOT recreate the Supabase auth user — auth is hard-
 * deleted on the original delete. A restored member needs a fresh
 * invite to actually sign in. The page-level success message tells
 * the admin this.
 *
 * Sentinel form (must match app/api/admin/members/[id]/delete/route.ts):
 *   deleted_{userId}_{timestampMs}_{originalEmail}@deleted.invalid
 *
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 4).
 * Target lookup + update go through `withTenantScope`. The collision
 * pre-check uses `crossTenantOK` because `User.email` is `@unique`
 * GLOBALLY in the schema — a scoped check would miss a collision in
 * another tenant and the update would 500 on Prisma's P2002 instead
 * of returning 409. The route still catches P2002 as belt-and-braces.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getUser();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(actor.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const orgId = await getActorOrganizationId(actor.id);

  const target = await withTenantScope(orgId, (db) =>
    db.user.findFirst({
      where: { id },
      select: { id: true, email: true, deletedAt: true },
    }),
  );
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (!target.deletedAt) {
    return NextResponse.json({ error: 'User is not soft-deleted; nothing to restore.' }, { status: 400 });
  }

  // If the email was rewritten, try to restore the original.
  let restoredEmail: string | null = null;
  let emailToWrite = target.email;

  const sentinelMatch = target.email.match(/^deleted_[0-9a-f-]{36}_\d+_(.+)@deleted\.invalid$/i);
  if (sentinelMatch) {
    const candidate = sentinelMatch[1];
    // User.email is @unique GLOBALLY — collisions in other tenants would
    // still trigger P2002 on the update below. Use crossTenantOK so the
    // pre-check sees them and surfaces a clean 409.
    const colliding = await crossTenantOK(() =>
      prisma.user.findFirst({
        where: { email: candidate, NOT: { id } },
        select: { id: true },
      }),
    );
    if (colliding) {
      return NextResponse.json(
        {
          error: `Cannot restore: another user (${colliding.id.slice(0, 8)}…) is currently using ${candidate}. Free or delete that account first.`,
        },
        { status: 409 },
      );
    }
    emailToWrite = candidate;
    restoredEmail = candidate;
  }

  try {
    await withTenantScope(orgId, (db) =>
      db.user.updateMany({
        where: { id },
        data: { deletedAt: null, email: emailToWrite },
      }),
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email collision on restore. Another active user has this address.' },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true, restoredEmail });
}
