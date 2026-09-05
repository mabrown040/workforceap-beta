import type { AdminUserAttributes } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Admin = ReturnType<typeof getSupabaseAdmin>;

/** ~100 years: Supabase has no "indefinite" ban, only a duration. */
const SOFT_DELETE_BAN_DURATION = '876600h';

export type DisableAuthUserResult =
  | { ok: true; alreadyMissing: boolean }
  | { ok: false; message: string };

/**
 * Admin "soft delete" used to hard-delete the Supabase auth user, which made
 * the app-side restore a no-op for sign-in (the row came back, the login did
 * not — 9/2/26 ops report). Ban the login instead: the member is locked out
 * exactly as before (`signInWithPassword` fails with a "banned" error), and
 * {@link reenableAuthUserAfterRestore} can lift it.
 */
export async function disableAuthUserForSoftDelete(
  admin: Admin,
  userId: string,
): Promise<DisableAuthUserResult> {
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: SOFT_DELETE_BAN_DURATION,
  });
  if (!error) return { ok: true, alreadyMissing: false };
  if (isUserNotFound(error.message, error.status)) {
    // Nothing to disable — the auth user is already gone (legacy hard delete).
    return { ok: true, alreadyMissing: true };
  }
  return { ok: false, message: error.message };
}

export type ReenableAuthUserResult =
  | { ok: true; action: 'unbanned' | 'recreated' }
  | { ok: false; message: string };

/**
 * Bring a restored user's login back. Lifts the soft-delete ban when the auth
 * user still exists; when it was hard-deleted by the old code path, re-creates
 * it under the SAME id (User.id is the auth id and is referenced everywhere)
 * with a confirmed email and no password, so the member finishes with the
 * normal "Reset password" flow.
 */
export async function reenableAuthUserAfterRestore(
  admin: Admin,
  user: { id: string; email: string; fullName?: string | null; phone?: string | null },
): Promise<ReenableAuthUserResult> {
  const { error: unbanError } = await admin.auth.admin.updateUserById(user.id, {
    ban_duration: 'none',
    email: user.email,
    email_confirm: true,
  });
  if (!unbanError) return { ok: true, action: 'unbanned' };
  if (isEmailTaken(unbanError.message, unbanError.status)) {
    // The restored row's address belongs to another login (a second account
    // for the same person, or the login's address was changed after the row
    // was created). Getting the person back in matters more than re-syncing
    // the address: lift the ban and leave the login's current email alone.
    const { error: unbanOnlyError } = await admin.auth.admin.updateUserById(user.id, {
      ban_duration: 'none',
    });
    if (!unbanOnlyError) return { ok: true, action: 'unbanned' };
    if (!isUserNotFound(unbanOnlyError.message, unbanOnlyError.status)) {
      return { ok: false, message: unbanOnlyError.message };
    }
  } else if (!isUserNotFound(unbanError.message, unbanError.status)) {
    return { ok: false, message: unbanError.message };
  }

  // GoTrue's admin create endpoint accepts a caller-supplied `id`; the
  // supabase-js type does not declare it, hence the cast.
  const attributes = {
    id: user.id,
    email: user.email,
    email_confirm: true,
    user_metadata: {
      ...(user.fullName ? { full_name: user.fullName } : {}),
      ...(user.phone ? { phone: user.phone } : {}),
    },
  } as AdminUserAttributes & { id: string };
  const { data, error: createError } = await admin.auth.admin.createUser(attributes);
  if (createError) {
    return { ok: false, message: `Auth user was hard-deleted and could not be re-created: ${createError.message}` };
  }
  if (data.user?.id !== user.id) {
    // The project ignored our id: do not leave a stray auth user behind.
    if (data.user?.id) {
      await admin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    }
    return {
      ok: false,
      message:
        'Auth user was hard-deleted and the auth service would not re-create it under the original id. Invite the member again from Admin → Invites.',
    };
  }
  return { ok: true, action: 'recreated' };
}

function isEmailTaken(message: string | undefined, status: number | undefined): boolean {
  if (status === 422 && /email/i.test(message ?? '')) return true;
  return /email.*(already|exists|registered|taken)|already.*registered/i.test(message ?? '');
}

function isUserNotFound(message: string | undefined, status: number | undefined): boolean {
  if (status === 404) return true;
  return /user.*not.*found|not found/i.test(message ?? '');
}
