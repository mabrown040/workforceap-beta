import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

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
    return NextResponse.json({ error: 'User is not soft-deleted; nothing to restore.' }, { status: 400 });
  }

  // If the email was rewritten, try to restore the original.
  let restoredEmail: string | null = null;
  let emailToWrite = target.email;

  const sentinelMatch = target.email.match(/^deleted_[0-9a-f-]{36}_\d+_(.+)@deleted\.invalid$/i);
  if (sentinelMatch) {
    const candidate = sentinelMatch[1];
    // Check if the original email is currently free.
    const colliding = await prisma.user.findFirst({
      where: { email: candidate, NOT: { id } },
      select: { id: true },
    });
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
    await prisma.user.update({
      where: { id },
      data: { deletedAt: null, email: emailToWrite },
    });
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
