import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

/**
 * Rewrite a soft-deleted user's email to the sentinel form so the
 * original address is freed for re-signup. Idempotent — does nothing
 * if the email is already in the sentinel form.
 *
 * Sentinel form (must match app/api/admin/members/[id]/delete/route.ts):
 *   deleted_{userId}_{timestampMs}_{originalEmail}@deleted.invalid
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getUser();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(actor.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, deletedAt: true },
  });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (!target.deletedAt) {
    return NextResponse.json({ error: 'User is not soft-deleted; cannot free email.' }, { status: 400 });
  }
  if (target.email.endsWith('@deleted.invalid')) {
    return NextResponse.json({ ok: true, alreadyFreed: true, currentEmail: target.email });
  }

  const newEmail = `deleted_${id}_${Date.now()}_${target.email}@deleted.invalid`.slice(0, 255);
  await prisma.user.update({
    where: { id },
    data: { email: newEmail },
  });

  return NextResponse.json({ ok: true, originalEmail: target.email, currentEmail: newEmail });
}
