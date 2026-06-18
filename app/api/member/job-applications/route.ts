import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
import { z } from 'zod';
import { captureApiError } from '@/lib/observability/captureApiError';
import { findRecentAiToolsForApplicationFeedback } from '@/lib/member/applicationAiFeedback';
import { awardPoints } from '@/lib/member/points';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

async function _GET() {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const applications = await prisma.$transaction((tx) => tx.jobApplication.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }));

    return NextResponse.json(applications);
  } catch (error) {
    captureApiError(error, { route: 'GET /api/member/job-applications' });
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
export const GET = withApiGuc(_GET);

// POST: Create a new job application
const createApplicationSchema = z.object({
  role: z.string().min(1, 'Job title is required').max(200),
  company: z.string().min(1, 'Company is required').max(200),
  appliedAt: z.string().datetime().nullable(),
  source: z.enum(['INDEED', 'LINKEDIN', 'DIRECT', 'OTHER']).default('OTHER'),
  nextInterviewDate: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(['SAVED', 'APPLIED', 'PHONE_SCREEN', 'INTERVIEWING', 'OFFER', 'ACCEPTED', 'REJECTED']).default('APPLIED'),
});async function _POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUserInDb(user);

    const body = await request.json();
    const parsed = createApplicationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const application = await prisma.$transaction((tx) => tx.jobApplication.create({
      data: {
        userId: user.id,
        role: parsed.data.role,
        company: parsed.data.company,
        appliedAt: parsed.data.appliedAt ? new Date(parsed.data.appliedAt) : null,
        source: parsed.data.source,
        status: parsed.data.status,
        nextInterviewDate: parsed.data.nextInterviewDate
          ? new Date(parsed.data.nextInterviewDate)
          : null,
        notes: parsed.data.notes || null,
      },
    }));

    await trackEvent({
      userId: user.id,
      eventName: 'application_added',
      entityType: 'job_application',
      entityId: application.id,
      sourcePage: '/dashboard/job-applications',
      metadata: {
        status: application.status,
        source: application.source,
      },
    });

    // Award points only when the row represents a REAL application, not a
    // saved lead. Codex P2 catch on PR #1061 — schema accepts `SAVED` even
    // though it defaults to APPLIED, so a client could still create a SAVED
    // row here. Sibling `/api/member/applications/[id]` PATCH handles the
    // SAVED → applied transition. Idempotent on application id.
    if (application.status !== 'SAVED') {
      awardPoints(user.id, 'job_application', application.id).catch(() => {});
    }

    const recentTools = await findRecentAiToolsForApplicationFeedback(prisma, user.id);
    const promptAiFeedback = recentTools.length > 0;

    auditLog({ actorUserId: user.id, action: 'member.jobApplication.create', targetType: 'JobApplication', targetId: application.id }).catch(() => {});
    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'create', object: { type: 'JobApplication', id: application.id }, result: { success: true } }).catch(() => {});
    return NextResponse.json(
      {
        application,
        promptAiFeedback,
        recentTools: promptAiFeedback
          ? recentTools.map((t) => ({ id: t.id, label: t.label, createdAt: t.createdAt.toISOString() }))
          : [],
      },
      { status: 201 },
    );
  } catch (error) {
    captureApiError(error, { route: 'POST /api/member/job-applications' });
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    );
  }
}
export const POST = withApiGuc(_POST);
