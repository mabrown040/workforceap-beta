import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(40),
  action: z.enum(['delete', 'close']).default('delete'),
});

/** Jobs employers may remove in bulk (not visible on the public board). */
const BULK_DELETABLE = new Set(['draft', 'pending', 'filled', 'closed']);

/** Jobs employers may close in bulk (only live or approved postings). */
const BULK_CLOSABLE = new Set(['live', 'approved']);

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { ids, action } = parsed.data;
  const uniqueIds = [...new Set(ids)];

  if (action === 'close') {
    // Bulk close operation
    const candidates = await prisma.job.findMany({
      where: { id: { in: uniqueIds }, employerId: ctx.employerId },
      select: { id: true, status: true, title: true },
    });

    const blocked = candidates.filter((j) => !BULK_CLOSABLE.has(j.status));
    if (blocked.length > 0) {
      return NextResponse.json(
        {
          error: 'Only live or approved postings can be closed. Drafts and already-closed roles are excluded.',
          blockedIds: blocked.map((b) => b.id),
        },
        { status: 400 }
      );
    }

    if (candidates.length !== uniqueIds.length) {
      return NextResponse.json({ error: 'One or more jobs were not found.' }, { status: 404 });
    }

    const result = await prisma.job.updateMany({
      where: { id: { in: uniqueIds }, employerId: ctx.employerId },
      data: { status: 'filled' },
    });

    return NextResponse.json({
      closed: result.count,
      titles: candidates.map((c) => c.title),
    });
  }

  // Bulk delete operation (default)
  const candidates = await prisma.job.findMany({
    where: { id: { in: uniqueIds }, employerId: ctx.employerId },
    select: { id: true, status: true, title: true },
  });

  const blocked = candidates.filter((j) => !BULK_DELETABLE.has(j.status));
  if (blocked.length > 0) {
    return NextResponse.json(
      {
        error: 'Live or approved postings cannot be bulk-deleted. Mark filled/closed first, or contact support.',
        blockedIds: blocked.map((b) => b.id),
      },
      { status: 400 }
    );
  }

  if (candidates.length !== uniqueIds.length) {
    return NextResponse.json({ error: 'One or more jobs were not found.' }, { status: 404 });
  }

  const result = await prisma.job.deleteMany({
    where: { id: { in: uniqueIds }, employerId: ctx.employerId },
  });

  return NextResponse.json({
    deleted: result.count,
    titles: candidates.map((c) => c.title),
  });
}
