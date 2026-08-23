import { prisma } from '@/lib/db/prisma';
import { withDbRetry, isConnectionAcquisitionError } from '@/lib/db/withDbRetry';
import { resolveProvisionOrganizationId } from '@/lib/tenant/resolveProvisionOrg';
import type { HeadersLike } from '@/lib/tenant/resolveOrgFromRequest';

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export type EnsureAppUserOptions = {
  /** Already-resolved org from the caller (layout / signup). */
  organizationId?: string | null;
  /** Request headers so host / x-wap-org-id can win over the default org. */
  headers?: HeadersLike;
};

function isUniquePkError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2002'
  );
}

/**
 * Self-heal for orphaned Supabase auth users.
 *
 * Background (2026-06-30 incident): several Supabase auth users had NO row in
 * the app `users` table (and some had no `profiles` row). They could sign in
 * via GoTrue, then every Prisma path that assumes a `users` row exists crashed:
 * the `member_events_user_id_fkey` FK on trackEvent during login, "Member not
 * found: <uuid>" on /dashboard and /dashboard/resume, and a P2025 on
 * `prisma.user.update` in /api/member/wioa-qualification.
 *
 * Given an authenticated Supabase user, this provisions the missing app rows
 * (a `users` row in the request org — or default `workforceap` on the
 * canonical host — with role 'member', plus a minimal `profiles` row)
 * in one transaction. It is idempotent — a no-op when the rows already
 * exist — and tolerates concurrent creation (duplicate-PK from a racing
 * request is treated as success). Existing `users.organizationId` is
 * never overwritten.
 *
 * Writes are wrapped with withDbRetry using isConnectionAcquisitionError so a
 * transient pooler blip while *acquiring* a connection is retried, but an
 * ambiguous mid-commit failure is not (the idempotency check absorbs the rest).
 */
export async function ensureAppUserProvisioned(
  user: AuthUser,
  options: EnsureAppUserOptions = {},
): Promise<void> {
  // Fast path: rows already present. Read is safe to retry broadly.
  const existing = await withDbRetry(() =>
    prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, profile: { select: { userId: true } } },
    }),
  );
  if (existing && existing.profile) return;

  const email = user.email?.trim() || `${user.id}@placeholder.local`;
  const fullName =
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
    'Member';
  const organizationId = await withDbRetry(() =>
    resolveProvisionOrganizationId({
      explicitOrganizationId: options.organizationId,
      headers: options.headers,
      metadata: user.user_metadata,
    }),
  );

  try {
    await withDbRetry(
      () =>
        prisma.$transaction(async (tx) => {
          await tx.user.upsert({
            where: { id: user.id },
            create: { id: user.id, organizationId, email, fullName },
            update: {},
          });

          let memberRole = await tx.role.findUnique({ where: { name: 'member' } });
          if (!memberRole) {
            memberRole = await tx.role.create({ data: { name: 'member' } });
          }
          // userId+roleId is unique; skipDuplicates makes the grant idempotent.
          await tx.userRole.createMany({
            data: [{ userId: user.id, roleId: memberRole.id }],
            skipDuplicates: true,
          });

          await tx.profile.upsert({
            where: { userId: user.id },
            create: { userId: user.id },
            update: {},
          });
        }),
      { shouldRetry: isConnectionAcquisitionError },
    );
  } catch (err) {
    // A concurrent request may have provisioned the rows between our read and
    // this write (duplicate-PK). Treat that as success.
    if (isUniquePkError(err)) return;
    throw err;
  }
}
