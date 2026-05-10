import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { sendPartnerMilestoneEmail } from '@/lib/notifications/partner-notify';
import { trackEvent } from '@/lib/events/track';
import { defaultOnboardingWindowEnd } from '@/lib/placement/defaultOnboardingWindow';
import { awardPoints } from '@/lib/member/points';

/**
 * Pick which program a placement should be credited to when the learner is
 * enrolled in multiple programs simultaneously.
 *
 * Heuristic: among the learner's `course_enrollments`, choose the one whose
 * `enrolledAt <= placedAt` and is most-recently started (i.e. the program
 * the learner had most recently entered at the time of placement). If no
 * enrollment row predates the placement, fall back to the earliest
 * enrollment so we still credit *some* program. If the learner has zero
 * `course_enrollments` rows, fall back to the legacy `User.enrolledProgram`
 * cache so unmigrated/seeded users still export cleanly. Audit punch list
 * item #6 (placements CSV export → WIOA per-program counts).
 */
function attributeProgramAtPlacement(
  enrollments: ReadonlyArray<{ programSlug: string; enrolledAt: Date }>,
  placedAt: Date,
  legacyEnrolledProgram: string | null,
): string | null {
  if (enrollments.length === 0) return legacyEnrolledProgram ?? null;
  if (enrollments.length === 1) return enrollments[0].programSlug;
  const placedMs = placedAt.getTime();
  const eligible = enrollments.filter((e) => e.enrolledAt.getTime() <= placedMs);
  const pool = eligible.length > 0 ? eligible : enrollments;
  let best = pool[0];
  for (const e of pool) {
    if (e.enrolledAt.getTime() > best.enrolledAt.getTime()) best = e;
  }
  return best.programSlug;
}

const placementSchema = z.object({
  userId: z.string().uuid(),
  employerName: z.string().min(1).max(200),
  jobTitle: z.string().min(1).max(200),
  startDate: z.string().optional().nullable(),
  salaryOffered: z.number().int().positive().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const orgId = await getActorOrganizationId(user.id);
  const superUser = await isSuperAdmin(user.id);

  const placements = await prisma.placementRecord.findMany({
    where: superUser ? undefined : { user: { organizationId: orgId } },
    take: 2000,
    orderBy: { placedAt: 'desc' },
    include: {
      // Pull all enrollments alongside the legacy `enrolledProgram` cache
      // so we can credit the program the learner had most recently entered
      // at placement time (multi-program correctness for the CSV export
      // that downstream funder/state reports consume).
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          enrolledProgram: true,
          courseEnrollments: {
            select: { programSlug: true, enrolledAt: true },
          },
        },
      },
    },
  });
  // Override `user.enrolledProgram` on the wire with the at-placement-time
  // attribution so existing CSV consumers (which read this field as the
  // "programCompleted" column) get accurate per-program placement counts
  // without needing a schema/contract change. The legacy field name is
  // preserved on purpose for backward compatibility.
  const attributed = placements.map((p) => ({
    ...p,
    user: {
      ...p.user,
      enrolledProgram: attributeProgramAtPlacement(
        p.user.courseEnrollments,
        p.placedAt,
        p.user.enrolledProgram,
      ),
    },
  }));
  return NextResponse.json(attributed);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = placementSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });

  const { userId, employerName, jobTitle, startDate, salaryOffered, notes } = parsed.data;

  const member = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const prior = await prisma.placementRecord.findUnique({ where: { userId } });
  const now = new Date();
  const windowEndForCreate = defaultOnboardingWindowEnd(now);
  const windowEndForUpdate =
    prior && !prior.onboardingWindowEnd ? defaultOnboardingWindowEnd(prior.placedAt) : undefined;

  const placement = await prisma.placementRecord.upsert({
    where: { userId },
    create: {
      userId,
      employerName,
      jobTitle,
      startDate: startDate ? new Date(startDate) : null,
      salaryOffered: salaryOffered ?? null,
      placedBy: user.id,
      notes: notes ?? null,
      onboardingWindowEnd: windowEndForCreate,
    },
    update: {
      employerName,
      jobTitle,
      startDate: startDate ? new Date(startDate) : null,
      salaryOffered: salaryOffered ?? null,
      notes: notes ?? null,
      ...(windowEndForUpdate ? { onboardingWindowEnd: windowEndForUpdate } : {}),
    },
  });

  // Calculate days from enrollment to placement for tracking
  const memberDetails = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      enrolledProgram: true,
      enrolledAt: true,
      courseEnrollments: {
        select: { programSlug: true, enrolledAt: true },
      },
    },
  });
  const daysToPlacement = memberDetails?.enrolledAt
    ? Math.floor((placement.placedAt.getTime() - memberDetails.enrolledAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  // For multi-program learners, credit the program they had most recently
  // entered at placement time. Keeps `programCompleted` field name for
  // downstream audit-log / CSV consumers (WIOA per-program reporting).
  const programCompleted = attributeProgramAtPlacement(
    memberDetails?.courseEnrollments ?? [],
    placement.placedAt,
    memberDetails?.enrolledProgram ?? null,
  );

  // Log placement for billing/invoice follow-up
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: 'placement_recorded',
      targetType: 'placement_record',
      targetId: placement.id,
      metadata: {
        employerName,
        jobTitle,
        programCompleted,
        daysToPlacement,
        salaryOffered: salaryOffered ?? null,
        invoiceFollowUp: true,
      },
    },
  });

  // Lifecycle event: placement_recorded (always — even on update)
  trackEvent({
    userId,
    eventName: 'placement_recorded',
    entityType: 'PlacementRecord',
    entityId: placement.id,
    metadata: { employerName, jobTitle, isNew: !prior, isEdit: !!prior, daysToPlacement },
  }).catch(() => {});

  // Award points to the placed member (idempotent on placement.id)
  awardPoints(userId, 'placement_recorded', placement.id).catch(() => {});

  if (!prior) {
    await sendPartnerMilestoneEmail(userId, 'Job placement', {
      Employer: employerName,
      Role: jobTitle,
    });
  }

  return NextResponse.json({ ...placement, daysToPlacement }, { status: 201 });
}