import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { ADMIN_SSR_LIST_CAP, isListTruncated, showingFirstLabel } from '@/lib/db/queryCaps';

import PageHeader from '@/components/portal/PageHeader';
import DeletedUsersClient, {
  type DeletedUserRow,
} from '@/components/admin/DeletedUsersClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Deleted users',
  description: 'Soft-deleted user records — free their email to allow re-signup, or restore.',
  path: '/admin/users/deleted',
});
}

/**
 * Soft-deleted users admin view. Built per user direction 2026-04-26
 * after they noticed an existing deleted row was still blocking re-
 * signup with the same email even after the delete-route fix in #757
 * (which only applies to future deletes).
 *
 * From here, an admin can:
 *   - "Free email" — rewrite the row's email to a sentinel form so
 *     the original address is reusable for new signups
 *   - "Restore" — clear deletedAt + restore the original email (if
 *     it was rewritten). NOTE: doesn't recreate Supabase auth, which
 *     is hard-deleted on delete — a restored member needs a fresh
 *     invite to sign in
 *   - "Free all emails" — batch-rewrite every soft-deleted row whose
 *     email still occupies the unique slot
 */
export default async function AdminDeletedUsersPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/users/deleted');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const rows = await prisma.user.findMany({
    take: ADMIN_SSR_LIST_CAP,
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
    select: {
      id: true,
      email: true,
      fullName: true,
      deletedAt: true,
      createdAt: true,
    },
  });

  const data: DeletedUserRow[] = rows.map((r) => {
    const parsed = parseSentinelEmail(r.email);
    return {
      id: r.id,
      fullName: r.fullName,
      currentEmail: r.email,
      originalEmail: parsed?.original ?? r.email,
      isFreed: parsed != null,
      deletedAt: r.deletedAt!.toISOString(),
      createdAt: r.createdAt.toISOString(),
    };
  });

  const stillBoundCount = data.filter((d) => !d.isFreed).length;

  return (
    <>
      <PageHeader
        title="Deleted users"
        subtitle={
          isListTruncated(data.length, ADMIN_SSR_LIST_CAP)
            ? showingFirstLabel(data.length, data.length, 'deleted users') + ' (page cap)'
            : 'Soft-deleted user records. Free their email to release the unique constraint so the address can be reused for a new signup, or restore the row to bring the user back.'
        }
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users', href: '/admin/users' },
          { label: 'Deleted' },
        ]}
      />
      <DeletedUsersClient rows={data} stillBoundCount={stillBoundCount} />
    </>
  );
}

/**
 * Parse the `deleted_{userId}_{timestampMs}_{originalEmail}@deleted.invalid`
 * sentinel form (see app/api/admin/members/[id]/delete/route.ts) to
 * recover the original email. Returns null if the email is not in
 * the sentinel form (i.e. legacy soft-deletes from before #757).
 */
function parseSentinelEmail(email: string): { original: string } | null {
  if (!email.endsWith('@deleted.invalid')) return null;
  const trimmed = email.slice(0, -'@deleted.invalid'.length);
  // deleted_{userId}_{timestampMs}_{originalEmail}
  // Strip 'deleted_' prefix, then UUID, then timestamp, then the rest is the email.
  const m = trimmed.match(/^deleted_([0-9a-f-]{36})_(\d+)_(.+)$/i);
  if (!m) return null;
  return { original: m[3] };
}
