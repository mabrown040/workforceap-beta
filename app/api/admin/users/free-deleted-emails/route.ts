import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { captureApiError } from '@/lib/observability/captureApiError';

/**
 * Batch-rewrite every soft-deleted user's email to the sentinel form
 * if it isn't already. Backfills the deletes that happened before
 * #757 added per-row email rewriting on delete.
 *
 * Sentinel form (must match app/api/admin/members/[id]/delete/route.ts):
 *   deleted_{userId}_{timestampMs}_{originalEmail}@deleted.invalid
 */
export async function POST() {
  const actor = await getUser();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(actor.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const candidates = await prisma.user.findMany({
    where: {
      deletedAt: { not: null },
      NOT: { email: { endsWith: '@deleted.invalid' } },
    },
    select: { id: true, email: true },
  });

  let freed = 0;
  const ts = Date.now();
  for (const u of candidates) {
    const newEmail = `deleted_${u.id}_${ts}_${u.email}@deleted.invalid`.slice(0, 255);
    try {
      await prisma.user.update({
        where: { id: u.id },
        data: { email: newEmail },
      });
      freed += 1;
    } catch (err) {
      captureApiError(err, { route: 'admin/users/free-deleted-emails', extra: { userId: u.id } });
    }
  }

  return NextResponse.json({ ok: true, freed, total: candidates.length });
}
