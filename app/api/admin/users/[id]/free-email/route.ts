import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { buildDeletedEmail, isDeletedEmail } from '../../_deletedEmail';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';

/**
 * Rewrite a soft-deleted user's email to the sentinel form so the
 * original address is freed for re-signup. Idempotent — does nothing
 * if the email is already in the sentinel form.
 *
 * Sentinel form (must match app/api/admin/members/[id]/delete/route.ts):
 *   deleted_{userId}_{timestampMs}_{originalEmail}@deleted.invalid
 *
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 4).
 * Lookup + update go through `withTenantScope` so an admin from Org A
 * cannot free an Org B user's email by guessing the UUID. `update`
 * becomes `updateMany` so the proxy can scope the where clause.
 */
async function _POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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
    return NextResponse.json({ error: 'User is not soft-deleted; cannot free email.' }, { status: 400 });
  }
  if (isDeletedEmail(target.email)) {
    return NextResponse.json({ ok: true, alreadyFreed: true, currentEmail: target.email });
  }

  const newEmail = buildDeletedEmail(id, Date.now(), target.email);
  if (!newEmail) {
    return NextResponse.json(
      { error: 'Cannot free email because it is too long to preserve for restore.' },
      { status: 400 },
    );
  }
  await withTenantScope(orgId, (db) =>
    db.user.updateMany({
      where: { id },
      data: { email: newEmail },
    }),
  );

  void auditLog({ actorUserId: actor.id, action: 'admin_user_free_email', targetType: 'user', targetId: id, metadata: { originalEmail: target.email, newEmail } }).catch(() => {});

  return NextResponse.json({ ok: true, originalEmail: target.email, currentEmail: newEmail });

  } catch (error) {
    console.error('/admin/users/[id]/free-email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
