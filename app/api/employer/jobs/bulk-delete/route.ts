import { NextRequest, NextResponse } from 'next/server';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
import { z } from 'zod';
import type { JobStatusEnum } from '@prisma/client';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { EMPLOYER_JOB_BULK_MAX_IDS_PER_REQUEST } from '@/lib/employer/employerJobsBulk';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(EMPLOYER_JOB_BULK_MAX_IDS_PER_REQUEST),
  action: z.enum(['delete', 'close']).default('delete'),
});

/** Jobs employers may remove in bulk (not visible on the public board). */
const BULK_DELETABLE_STATUSES: JobStatusEnum[] = ['draft', 'pending', 'filled', 'closed'];
const BULK_DELETABLE = new Set(BULK_DELETABLE_STATUSES);

/** Jobs employers may close in bulk (only live or approved postings). */
const BULK_CLOSABLE_STATUSES: JobStatusEnum[] = ['live', 'approved'];
const BULK_CLOSABLE = new Set(BULK_CLOSABLE_STATUSES);

export const POST = withApiGuc(async (request: NextRequest) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const tooMany = parsed.error.issues.some(
      (issue) => issue.code === 'too_big' && issue.path.length === 1 && issue.path[0] === 'ids'
    );
    return NextResponse.json(
      {
        error: tooMany
          ? `Too many postings in one request (max ${EMPLOYER_JOB_BULK_MAX_IDS_PER_REQUEST}). Try again — the portal sends multiple batches automatically.`
          : 'Invalid request',
      },
      { status: 400 }
    );
  }

  const { ids, action } = parsed.data;
  const uniqueIds = [...new Set(ids)];

  if (action === 'close') {
    // Bulk close operation
    const candidates = await prisma.$transaction((tx) => tx.job.findMany({
      where: { id: { in: uniqueIds }, employerId: ctx.employerId },
      select: { id: true, status: true, title: true },
      take: 100,
    }));

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

    const result = await prisma.$transaction((tx) => tx.job.updateMany({
      where: { id: { in: uniqueIds }, employerId: ctx.employerId, status: { in: BULK_CLOSABLE_STATUSES } },
      data: { status: 'closed' },
    }));

    if (result.count !== uniqueIds.length) {
      return NextResponse.json({ error: 'One or more jobs changed status. Refresh and try again.' }, { status: 409 });
    }

    auditLog({ actorUserId: user.id, action: 'employer_jobs_bulk_close', targetType: 'Employer', targetId: ctx.employerId, metadata: { count: result.count } }).catch(() => {});
    logAuditEvent({ user: { id: user.id, role: 'employer' }, verb: 'updated', object: { type: 'Employer', id: ctx.employerId }, result: { success: true, extensions: { count: result.count, action: 'bulk_close' } } }).catch(() => {});
    return NextResponse.json({
      closed: result.count,
      titles: candidates.map((c) => c.title),
    });
  }

  // Bulk delete operation (default)
  const candidates = await prisma.$transaction((tx) => tx.job.findMany({
    where: { id: { in: uniqueIds }, employerId: ctx.employerId },
    select: { id: true, status: true, title: true },
    take: 100,
  }));

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

  const result = await prisma.$transaction((tx) => tx.job.deleteMany({
    where: { id: { in: uniqueIds }, employerId: ctx.employerId, status: { in: BULK_DELETABLE_STATUSES } },
  }));

  if (result.count !== uniqueIds.length) {
    return NextResponse.json({ error: 'One or more jobs changed status. Refresh and try again.' }, { status: 409 });
  }

  auditLog({ actorUserId: user.id, action: 'employer_jobs_bulk_delete', targetType: 'Employer', targetId: ctx.employerId, metadata: { count: result.count } }).catch(() => {});
  logAuditEvent({ user: { id: user.id, role: 'employer' }, verb: 'deleted', object: { type: 'Employer', id: ctx.employerId }, result: { success: true, extensions: { count: result.count, action: 'bulk_delete' } } }).catch(() => {});
  return NextResponse.json({
    deleted: result.count,
    titles: candidates.map((c) => c.title),
  });

  } catch (error) {
    console.error('/employer/jobs/bulk-delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
