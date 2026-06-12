import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
import { z } from 'zod';
import { captureApiError } from '@/lib/observability/captureApiError';
import { awardPoints } from '@/lib/member/points';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const createSchema = z.object({
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  status: z.enum(['SAVED', 'APPLIED', 'PHONE_SCREEN', 'INTERVIEWING', 'OFFER', 'ACCEPTED', 'REJECTED']).optional().default('SAVED'),
  appliedAt: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  url: z.string().url().optional().nullable().or(z.literal('')),
});async function _GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    try {
      await ensureUserInDb(user);
      const applications = await prisma.$transaction((tx) => tx.jobApplication.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }));
      return NextResponse.json({ applications });
    } catch (err) {
      captureApiError(err, { route: 'member/applications GET' });
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  } catch (error) {
    console.error('/member/applications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
    }
  
    const { company, role, status, appliedAt, notes, url } = parsed.data;
  
    try {
      await ensureUserInDb(user);
      const app = await prisma.$transaction((tx) => tx.jobApplication.create({
        data: {
          userId: user.id,
          company,
          role,
          status,
          appliedAt: appliedAt?.trim() ? new Date(appliedAt) : null,
          notes: notes || null,
          url: url || null,
        },
      }));
      await trackEvent({ userId: user.id, eventName: 'application_added', entityType: 'job_application', entityId: app.id });
      // Award points only when the row represents a REAL application, not a
      // saved lead. Codex P2 catch on PR #1061 — schema defaults to `SAVED`, so
      // awarding on every create let users inflate points by saving jobs. The
      // PATCH route (`/api/member/applications/[id]`) handles the transition
      // from SAVED → APPLIED/etc. Idempotent on application id.
      if (status !== 'SAVED') {
        awardPoints(user.id, 'job_application', app.id).catch(() => {});
      }
      return NextResponse.json({ application: app });
    } catch (err) {
      captureApiError(err, { route: 'member/applications POST' });
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  } catch (error) {
    console.error('/member/applications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
