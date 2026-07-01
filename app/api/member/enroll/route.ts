import { NextResponse, after } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { sendPartnerMilestoneEmail } from '@/lib/notifications/partner-notify';
import { sendCourseEnrolledEmail } from '@/lib/email';
import { maybeSendCourseKickoffEmail } from '@/lib/coursera/courseKickoff';
import { trackEvent } from '@/lib/events/track';
import { getActivePrograms, isProgramSlugActiveInCatalog } from '@/lib/platform/programCatalog';
import { isMemberWioaVerified } from '@/lib/platform/trainingEnrollmentGate';
import { awardPoints } from '@/lib/member/points';
import { invalidateMemberState } from '@/lib/member/getMemberState';
import { cookies } from 'next/headers';
import { MEMBER_REFERRAL_COOKIE, rewardReferralOnEnrollment } from '@/lib/member/referrals';
import { auditLog } from '@/lib/audit';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { logAuditEvent } from '@/lib/audit/log';
export const POST = withApiGuc(async (request: Request) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const slug = typeof o.programSlug === 'string' ? o.programSlug.trim() : '';

  if (!slug) {
    return NextResponse.json({ error: 'programSlug is required' }, { status: 400 });
  }

  const activePrograms = await getActivePrograms();
  if (!isProgramSlugActiveInCatalog(activePrograms, slug)) {
    return NextResponse.json({ error: 'That program is not available for enrollment right now.' }, { status: 400 });
  }
  const programView = activePrograms.find((p) => p.slug === slug)!;
  const programTitle = programView.static?.title ?? programView.name;

  const existing = await prisma.$transaction((tx) => tx.user.findUnique({
    where: { id: user.id },
    select: {
      enrolledProgram: true,
      wioaReviewStatus: true,
      // Multi-program: read enrolledByAdminId from the primary enrollment row
      // (the WIOA gate cares whether an admin override is in play, which is
      // tracked on the primary row). Returns at most one row via the partial
      // unique index `course_enrollments_user_primary_uidx`.
      courseEnrollments: {
        where: { isPrimary: true },
        select: { enrolledByAdminId: true },
        take: 1,
      },
    },
  }));

  const gate = isMemberWioaVerified({
    wioaReviewStatus: existing?.wioaReviewStatus,
    enrolledByAdminId: existing?.courseEnrollments?.[0]?.enrolledByAdminId,
  });
  if (!gate.ok) {
    const messages: Record<string, string> = {
      WIOA_NOT_STARTED:
        "Before you can enroll, you'll need to complete a brief eligibility screening. It takes about 5 minutes.",
      WIOA_PENDING:
        "Your eligibility screening is under review. We'll let you know once it's approved.",
      WIOA_NOT_ELIGIBLE:
        "Unfortunately, you're not eligible for this program based on current WIOA criteria. Let's find the right path.",
    };
    return NextResponse.json(
      { error: messages[gate.code] ?? 'Enrollment not available', code: gate.code },
      { status: 400 }
    );
  }

  if (existing?.enrolledProgram) {
    return NextResponse.json({ error: 'Already enrolled in a program. Changes require admin.' }, { status: 400 });
  }

  const now = new Date();
  const updatedUser = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: user.id },
      data: {
        enrolledProgram: slug,
        enrolledAt: now,
      },
      select: { email: true, fullName: true, organizationId: true },
    });
    // Multi-program: self-serve enroll is the user's first program, so the
    // row is marked isPrimary = true. Composite-keyed upsert prevents
    // duplicate (userId, programSlug) rows if the request retries.
    // Code above this transaction blocks if existing.enrolledProgram is
    // already set, so there shouldn't be a competing primary row.
    const enrollment = await tx.courseEnrollment.upsert({
      where: { userId_programSlug: { userId: user.id, programSlug: slug } },
      create: {
        organizationId: u.organizationId,
        userId: user.id,
        programSlug: slug,
        isPrimary: true,
        enrolledAt: now,
        enrolledByAdminId: null,
      },
      update: {
        isPrimary: true,
        enrolledAt: now,
        enrolledByAdminId: null,
      },
      select: { id: true },
    });
    return { user: u, enrollmentId: enrollment.id };
  });

  after(() =>
    auditLog({
      actorUserId: user.id,
      action: 'member_program_enroll',
      targetType: 'user',
      targetId: user.id,
      metadata: { programSlug: slug, programTitle },
    }).catch(() => {})
  );

  after(() => awardPoints(user.id, 'program_enrolled', slug).catch(() => {}));

  // Member-to-member referral: reward both sides on enrollment (idempotent, non-blocking).
  after(() =>
    cookies()
      .then((store) => rewardReferralOnEnrollment(user.id, store.get(MEMBER_REFERRAL_COOKIE)?.value))
      .catch(() => {})
  );

  // Lifecycle event: program_enrolled
  after(() =>
    trackEvent({
      userId: user.id,
      eventName: 'program_enrolled',
      entityType: 'Program',
      entityId: slug,
      metadata: { programTitle },
    }).catch(() => {})
  );

  after(() =>
    sendPartnerMilestoneEmail(user.id, 'Program enrollment', {
      Program: programTitle,
    }).catch((err) => console.error('Partner milestone email failed:', err))
  );

  after(() =>
    sendCourseEnrolledEmail({
      to: updatedUser.user.email,
      fullName: updatedUser.user.fullName,
      programName: programTitle,
    }).catch((err) => console.error('Course enrolled email failed:', err))
  );

  // Sprint R3 — fire-and-forget kickoff email (idempotent per enrollment row).
  after(() =>
    maybeSendCourseKickoffEmail({
      userId: user.id,
      enrollmentId: updatedUser.enrollmentId,
      programSlug: slug,
      email: updatedUser.user.email,
      fullName: updatedUser.user.fullName,
    }).catch(() => { /* already logged inside */ })
  );

  // Invalidate cached member state so dashboard reflects enrollment immediately
  await invalidateMemberState(user.id);

  after(() =>
    auditLog({ actorUserId: user.id, action: 'member.program.enroll', targetType: 'ProgramEnrollment', targetId: slug }).catch(() => {})
  );
  after(() =>
    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'create', object: { type: 'ProgramEnrollment', id: slug }, result: { success: true } }).catch(() => {})
  );
  return NextResponse.json({ ok: true, programSlug: slug });

  } catch (error) {
    console.error('/member/enroll error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

