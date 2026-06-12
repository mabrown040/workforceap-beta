import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
import { captureApiError } from '@/lib/observability/captureApiError';
import { getOrCreateMemberCounselorThread } from '@/lib/messages/counselorThread';
import { findRecentAiToolsForApplicationFeedback } from '@/lib/member/applicationAiFeedback';
import { awardPoints } from '@/lib/member/points';

import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * Log an external job application — Member Apply Loop.
 *
 * Per /plan-ceo-review (2026-04-26): the curated Job Board already has a
 * working apply flow (POST /api/dashboard/jobs/[id]/apply submits to the
 * employer + tracks). The gap was external applications: members find
 * jobs on Indeed/LinkedIn, apply there, but had no fast way to tell
 * WorkforceAP they applied — meaning the platform had no visibility on
 * actual applications submitted vs. just AI tool runs (vanity metric).
 *
 * This endpoint records an external application as a JobApplication row
 * with status=APPLIED + appliedAt=now, tags it with `via: 'external-log'`
 * so admin/board reports can attribute it correctly, and best-effort
 * notifies the counselor via the member↔counselor thread so they can
 * offer follow-up support (interview prep, references, etc.).
 *
 * The actual submission to the employer happens on the external site —
 * WorkforceAP's job is to capture the apply intent so the funnel reflects
 * placements, not just engagement.
 */
const bodySchema = z.object({
  company: z.string().min(1, 'Company is required').max(200),
  role: z.string().min(1, 'Role is required').max(200),
  url: z.string().url().max(2000).optional().or(z.literal('')),
  source: z.enum(['INDEED', 'LINKEDIN', 'GLASSDOOR', 'ZIPRECRUITER', 'WORKINTEXAS', 'AUSTINJOBS', 'DIRECT', 'OTHER']).default('OTHER'),
  notes: z.string().max(2000).optional(),
});

const SOURCE_DETAIL_LABELS = {
  INDEED: 'Indeed',
  LINKEDIN: 'LinkedIn',
  GLASSDOOR: 'Glassdoor',
  ZIPRECRUITER: 'ZipRecruiter',
  WORKINTEXAS: 'WorkInTexas',
  AUSTINJOBS: 'AustinJobs.com',
  DIRECT: 'company site',
  OTHER: 'external board',
} as const;

function toCanonicalSource(source: keyof typeof SOURCE_DETAIL_LABELS): 'INDEED' | 'LINKEDIN' | 'DIRECT' | 'OTHER' {
  if (source === 'INDEED' || source === 'LINKEDIN' || source === 'DIRECT') return source;
  return 'OTHER';
}export const POST = withApiGuc(async (req: NextRequest) => {
  try {
    const user = await getUser();
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureUserInDb(user);

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
        { status: 400 },
      );
    }
    const { company, role, url, source, notes } = parsed.data;
    const canonicalSource = toCanonicalSource(source);
    const sourceLabel = SOURCE_DETAIL_LABELS[source];
    const normalizedNotes = [
      sourceLabel && canonicalSource === 'OTHER' ? `Source board: ${sourceLabel}` : null,
      notes?.trim() || null,
    ].filter(Boolean).join('\n');

    const application = await prisma.$transaction((tx) => tx.jobApplication.create({
      data: {
        userId: user.id,
        company: company.trim(),
        role: role.trim(),
        status: 'APPLIED',
        appliedAt: new Date(),
        source: canonicalSource,
        url: url?.trim() || null,
        notes: normalizedNotes || null,
      },
    }));

    trackEvent({
      userId: user.id,
      eventName: 'application_added',
      entityType: 'job_application',
      entityId: application.id,
      metadata: {
        via: 'external-log',
        source: canonicalSource,
        source_detail: source,
        source_label: sourceLabel,
        company: company.trim(),
        role: role.trim(),
      },
      sourcePage: '/dashboard/jobs',
    }).catch(() => {});

    // Award points (idempotent on application id)
    awardPoints(user.id, 'job_application', application.id).catch(() => {});

    // Best-effort counselor notification — drop a system message into the
    // member↔counselor thread so the counselor sees it in their command
    // center (Apply Loop integrates with /plan-ceo-review Task 2).
    try {
      const thread = await getOrCreateMemberCounselorThread(user.id);
      const link = url ? ` (${url})` : '';
      await prisma.$transaction((tx) => tx.message.create({
        data: {
          threadId: thread.id,
          authorId: user.id,
          body: `Applied to ${role.trim()} at ${company.trim()} via ${sourceLabel}${link}. Logged from the Job Board.`,
        },
      }));
    } catch (notifyErr) {
      console.error('[apply-loop:log-external] counselor notify failed', notifyErr);
    }

    const recentTools = await findRecentAiToolsForApplicationFeedback(prisma, user.id);
    const promptAiFeedback = recentTools.length > 0;

    return NextResponse.json({
      ok: true,
      applicationId: application.id,
      appliedAt: application.appliedAt,
      promptAiFeedback,
      recentTools: promptAiFeedback
        ? recentTools.map((t) => ({ id: t.id, label: t.label, createdAt: t.createdAt.toISOString() }))
        : [],
    });
  } catch (error) {
    captureApiError(error, { route: 'POST /api/member/job-applications/log-external' });
    return NextResponse.json({ error: 'Failed to log application' }, { status: 500 });
  }
});
