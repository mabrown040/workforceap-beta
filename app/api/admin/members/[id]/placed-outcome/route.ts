import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { trackEvent } from '@/lib/events/track';
import { auditLog } from '@/lib/audit';
import { sendPartnerMilestoneEmail } from '@/lib/notifications/partner-notify';
import { defaultOnboardingWindowEnd } from '@/lib/placement/defaultOnboardingWindow';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const bodySchema = z.object({
  employerName: z.string().min(1).max(300).trim(),
  jobTitle: z.string().min(1).max(300).trim(),
  startingSalary: z.number().int().min(0).optional().nullable(),
  placedAt: z.string().datetime().optional(),
  programSlug: z.string().max(120).optional().nullable(),
  notes: z.string().max(8000).optional().nullable(),
  // WIOA / grant-reporting fields (all optional)
  wageAtFollowUp: z.number().int().min(0).optional().nullable(),
  retentionStatus: z.string().max(60).optional().nullable(),
  startDateVerified: z.boolean().optional(),
  fundingSource: z.string().max(120).optional().nullable(),
  grantReportingNotes: z.string().max(8000).optional().nullable(),
});

type Props = { params: Promise<{ id: string }> };export const POST = withApiGuc(async (request: NextRequest, { params }: Props) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: memberId } = await params;
  const orgId = await getActorOrganizationId(user.id);

  const member = await prisma.user.findFirst({ where: { id: memberId, deletedAt: null , organizationId: orgId },
    select: { id: true, enrolledProgram: true },
  });
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const d = parsed.data;
  const placedAt = d.placedAt ? new Date(d.placedAt) : new Date();
  const programSlug = d.programSlug?.trim() || member.enrolledProgram || null;

  const prior = await prisma.placementRecord.findUnique({ where: { userId: memberId } });
  const windowEnd = defaultOnboardingWindowEnd(placedAt);

  // Write to canonical PlacementRecord (includes WIOA fields)
  const placement = await prisma.placementRecord.upsert({
    where: { userId: memberId },
    create: {
      userId: memberId,
      employerName: d.employerName,
      jobTitle: d.jobTitle,
      salaryOffered: d.startingSalary ?? null,
      placedAt,
      placedBy: user.id,
      programSlug,
      notes: d.notes?.trim() || null,
      wageAtFollowUp: d.wageAtFollowUp ?? null,
      retentionStatus: d.retentionStatus?.trim() || null,
      startDateVerified: d.startDateVerified ?? false,
      fundingSource: d.fundingSource?.trim() || null,
      grantReportingNotes: d.grantReportingNotes?.trim() || null,
      onboardingWindowEnd: windowEnd,
    },
    update: {
      employerName: d.employerName,
      jobTitle: d.jobTitle,
      salaryOffered: d.startingSalary ?? null,
      placedAt,
      programSlug,
      notes: d.notes?.trim() || null,
      wageAtFollowUp: d.wageAtFollowUp ?? null,
      retentionStatus: d.retentionStatus?.trim() || null,
      startDateVerified: d.startDateVerified ?? false,
      fundingSource: d.fundingSource?.trim() || null,
      grantReportingNotes: d.grantReportingNotes?.trim() || null,
      ...(prior?.onboardingWindowEnd ? {} : { onboardingWindowEnd: windowEnd }),
    },
  });

  // Keep legacy PlacedOutcome in sync during migration period.
  // TODO: Remove once PlacedOutcome is fully retired.
  await prisma.placedOutcome.upsert({
    where: { userId: memberId },
    create: {
      userId: memberId,
      employerName: d.employerName,
      jobTitle: d.jobTitle,
      startingSalary: d.startingSalary ?? null,
      placedAt,
      programSlug,
      notes: d.notes?.trim() || null,
    },
    update: {
      employerName: d.employerName,
      jobTitle: d.jobTitle,
      startingSalary: d.startingSalary ?? null,
      placedAt,
      programSlug,
      notes: d.notes?.trim() || null,
    },
  });

  // WIOA grant claims need a tamper-evident change history (AUDIT H-DEP4).
  // MemberEvent rows are mutable product analytics; AuditLog is the
  // retained 3-year record with actor attribution.
  await auditLog({
    actorUserId: user.id,
    action: prior ? 'placement_update' : 'placement_create',
    targetType: 'placement_record',
    targetId: placement.id,
    metadata: {
      memberId,
      before: prior
        ? {
            employerName: prior.employerName,
            jobTitle: prior.jobTitle,
            salaryOffered: prior.salaryOffered,
            placedAt: prior.placedAt.toISOString(),
            wageAtFollowUp: prior.wageAtFollowUp,
            retentionStatus: prior.retentionStatus,
            startDateVerified: prior.startDateVerified,
            fundingSource: prior.fundingSource,
          }
        : null,
      after: {
        employerName: placement.employerName,
        jobTitle: placement.jobTitle,
        salaryOffered: placement.salaryOffered,
        placedAt: placement.placedAt.toISOString(),
        wageAtFollowUp: placement.wageAtFollowUp,
        retentionStatus: placement.retentionStatus,
        startDateVerified: placement.startDateVerified,
        fundingSource: placement.fundingSource,
      },
    },
  });

  // Lifecycle event: placement edits create new events for audit trail.
  trackEvent({
    userId: memberId,
    eventName: 'placement_recorded',
    entityType: 'PlacementRecord',
    entityId: placement.id,
    metadata: {
      employerName: d.employerName,
      jobTitle: d.jobTitle,
      isNew: !prior,
      isEdit: !!prior,
      recordedBy: user.id,
    },
  }).catch(() => {});

  // Partner milestone email on first placement only
  if (!prior) {
    sendPartnerMilestoneEmail(memberId, 'Job placement', {
      Employer: d.employerName,
      Role: d.jobTitle,
    }).catch((err) => console.error('Partner milestone email failed:', err));
  }

  return NextResponse.json({
    ok: true,
    placedOutcome: {
      id: placement.id,
      employerName: placement.employerName,
      jobTitle: placement.jobTitle,
      startingSalary: placement.salaryOffered,
      placedAt: placement.placedAt.toISOString(),
      programSlug: placement.programSlug,
      notes: placement.notes,
      wageAtFollowUp: placement.wageAtFollowUp,
      retentionStatus: placement.retentionStatus,
      startDateVerified: placement.startDateVerified,
      fundingSource: placement.fundingSource,
      grantReportingNotes: placement.grantReportingNotes,
    },
  });

  } catch (error) {
    console.error('/admin/members/[id]/placed-outcome error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

