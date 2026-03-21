import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(40),
});

/** Jobs employers may remove in bulk (not visible on the public board). */
const BULK_DELETABLE = new Set(['draft', 'pending', 'filled', 'closed']);

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

  const { ids } = parsed.data;
  const uniqueIds = [...new Set(ids)];

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
