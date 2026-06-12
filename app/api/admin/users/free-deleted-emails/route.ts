import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { captureApiError } from '@/lib/observability/captureApiError';
import { buildDeletedEmail } from '../_deletedEmail';

/**
 * Batch-rewrite every soft-deleted user's email to the sentinel form
 * if it isn't already. Backfills the deletes that happened before
 * #757 added per-row email rewriting on delete.
 *
 * Sentinel form (must match app/api/admin/members/[id]/delete/route.ts):
 *   deleted_{userId}_{timestampMs}_{originalEmail}@deleted.invalid
 *
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 4).
 * The list + per-row update go through `withTenantScope` so an admin
 * from Org A only backfills their own tenant's soft-deletes. A super-
 * admin who needs to do this platform-wide should run the operation
 * once per tenant.
 */
export async function POST() {
  try {
    const actor = await getUser();
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(actor.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  
    const orgId = await getActorOrganizationId(actor.id);
  
    const candidates = await withTenantScope(orgId, (db) =>
      db.user.findMany({
        where: {
          deletedAt: { not: null },
          NOT: { email: { endsWith: '@deleted.invalid' } },
        },
        select: { id: true, email: true },
        take: 100,
      }),
    );
  
    let freed = 0;
    let skipped = 0;
    const ts = Date.now();
    for (const u of candidates) {
      const newEmail = buildDeletedEmail(u.id, ts, u.email);
      if (!newEmail) {
        skipped += 1;
        continue;
      }
      try {
        await withTenantScope(orgId, (db) =>
          db.user.updateMany({
            where: { id: u.id },
            data: { email: newEmail },
          }),
        );
        freed += 1;
      } catch (err) {
        captureApiError(err, { route: 'admin/users/free-deleted-emails', extra: { userId: u.id } });
      }
    }
  
    return NextResponse.json({ ok: true, freed, skipped, total: candidates.length });
  } catch (error) {
    console.error('/admin/users/free-deleted-emails:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
