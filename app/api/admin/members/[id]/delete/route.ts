import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { disableAuthUserForSoftDelete } from '@/lib/admin/authUserLifecycle';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { getProfileRole } from '@/lib/auth/roles';
import { withDbRetry } from '@/lib/db/withDbRetry';
import {
  ACCOUNT_STORAGE_DELETE_FAILED,
  MEMBER_FILES_BUCKET,
  MEMBER_RESUME_BUCKET,
  deleteUserStorageObjects,
} from '@/lib/gdpr/deleteUserStorage';

export const POST = withApiGuc(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await requireAdmin(user.id);

    const { id } = await params;

    // 9/5/26 ops report: an admin deleted what looked like a second "member"
    // account from the users list, but that row was the one backing their own
    // sign-in (User.id is the Supabase auth id). The soft delete then locked
    // the very login they were using and left them unable to sign in or reset.
    // The super-admin delete route already refuses this; mirror it here.
    if (id === user.id) {
      return NextResponse.json(
        {
          error:
            'You cannot delete the account you are signed in with. Sign in with a different admin account to delete this one.',
        },
        { status: 400 },
      );
    }

    const orgId = await getActorOrganizationId(user.id);

    // Soft-delete the Prisma row AND release the email from the unique
    // constraint so a fresh sign-up with the same address can succeed.
    // Without the email rewrite, re-creating a deleted test user (or a
    // real user who deleted their account and wants to come back) hits
    // the User.email @unique constraint and the new account can't be
    // created. We rewrite to a sentinel address that preserves the
    // original for audit (deleted_<userId>_<originalEmail>@deleted.invalid).
    //
    // Tenant scope: lookup + update wrapped in withTenantScope so an
    // admin from Org A cannot delete a member from Org B by guessing
    // their UUID.
    const now = new Date();
    const existing = await withTenantScope(orgId, (db) =>
      db.user.findFirst({
        where: { id },
        select: {
          email: true,
          deletedAt: true,
          profile: {
            select: { resumeOriginalPath: true, resumeEnhancedPath: true },
          },
          userCertifications: { select: { proofUrl: true } },
        },
      }),
    );
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Soft-delete still removes member-resumes / member-files objects so PII
    // does not linger while the row is recoverable. Restore will not bring
    // those blobs back. Fail closed before rewriting the row so a storage
    // error cannot leave a "deleted" member with leftover files.
    const extraPaths = [
      existing.profile?.resumeOriginalPath
        ? { bucket: MEMBER_RESUME_BUCKET, path: existing.profile.resumeOriginalPath }
        : null,
      existing.profile?.resumeEnhancedPath
        ? { bucket: MEMBER_RESUME_BUCKET, path: existing.profile.resumeEnhancedPath }
        : null,
      ...existing.userCertifications.map((cert) =>
        cert.proofUrl ? { bucket: MEMBER_FILES_BUCKET, path: cert.proofUrl } : null,
      ),
    ].filter((row): row is { bucket: string; path: string } => Boolean(row));

    const storage = await deleteUserStorageObjects(id, { extraPaths });
    if (!storage.ok) {
      console.error(`[admin/members/[id]/delete] storage object delete failed for ${id}:`, storage.error);
      return NextResponse.json({ error: ACCOUNT_STORAGE_DELETE_FAILED }, { status: 502 });
    }

    // If the row is already soft-deleted, leave its email rewrite alone —
    // don't double-rewrite (would build up nested "deleted_deleted_..."
    // prefixes if an admin clicks delete twice).
    const newEmail = existing.deletedAt
      ? existing.email
      : `deleted_${id}_${now.getTime()}_${existing.email}@deleted.invalid`.slice(0, 255);

    await withTenantScope(orgId, (db) =>
      db.user.update({
        where: { id },
        data: {
          deletedAt: now,
          email: newEmail,
        },
      }),
    );

    // Soft delete = lock the login, never destroy it (see
    // lib/admin/authUserLifecycle.ts): restore can lift the ban later.
    const disabled = await disableAuthUserForSoftDelete(getSupabaseAdmin(), id);
    if (!disabled.ok) {
      console.error('[admin/members/[id]/delete] Supabase auth disable error:', disabled.message);
    }

    const profileRole = await withDbRetry(() => getProfileRole(user.id)).catch((err) => {
      console.error('[api:admin-member-delete] profileRole lookup failed; degrading to member', err);
      return 'member';
    });
    auditLog({ actorUserId: user.id, action: 'admin_member_delete', targetType: 'User', targetId: id, metadata: { orgId } }).catch((err) => console.error('[audit] admin_member_delete:', err));
    await logAuditEvent({
      user: { id: user.id, role: profileRole ?? undefined },
      verb: 'deleted',
      object: { type: 'User', id },
      result: { success: true },
      request: auditRequestMeta(request),
      orgId,
    }).catch((err) => console.error('[audit] member delete:', err));
    auditLog({ actorUserId: user.id, action: 'admin_member_deleted', targetType: 'User', targetId: id, metadata: { orgId } }).catch(() => {});

    return NextResponse.json({ ok: true, originalEmail: existing.email });
  } catch (error) {
    console.error('[admin/members/[id]/delete POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
