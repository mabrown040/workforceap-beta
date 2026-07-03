import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { captureApiError } from '@/lib/observability/captureApiError';

import { withApiGuc } from '@/lib/db/withRequestGuc';

async function _GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const saved = await prisma.$transaction((tx) => tx.savedJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { jobId: true },
    }));

    return NextResponse.json({ jobIds: saved.map((s) => s.jobId) });
  } catch (error) {
    captureApiError(error, { route: 'GET /api/member/saved-jobs' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);

const bodySchema = z.object({ jobId: z.string().min(1) });

async function _POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
    }

    await ensureUserInDb(user);

    const job = await prisma.$transaction((tx) => tx.job.findUnique({
      where: { id: parsed.data.jobId },
      select: { id: true },
    }));
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // Idempotent: upsert on the unique (userId, jobId) pair so a double-click
    // or retry never throws a unique-constraint error.
    await prisma.$transaction((tx) => tx.savedJob.upsert({
      where: { userId_jobId: { userId: user.id, jobId: parsed.data.jobId } },
      update: {},
      create: { userId: user.id, jobId: parsed.data.jobId },
    }));

    return NextResponse.json({ saved: true }, { status: 201 });
  } catch (error) {
    captureApiError(error, { route: 'POST /api/member/saved-jobs' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);

async function _DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let jobId = request.nextUrl.searchParams.get('jobId');
    if (!jobId) {
      const body = await request.json().catch(() => null);
      jobId = typeof body?.jobId === 'string' ? body.jobId : null;
    }
    if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 });

    await prisma.$transaction((tx) => tx.savedJob.deleteMany({
      where: { userId: user.id, jobId },
    }));

    return NextResponse.json({ saved: false });
  } catch (error) {
    captureApiError(error, { route: 'DELETE /api/member/saved-jobs' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const DELETE = withApiGuc(_DELETE);
