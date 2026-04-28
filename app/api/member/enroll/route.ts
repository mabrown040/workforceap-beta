import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { sendPartnerMilestoneEmail } from '@/lib/notifications/partner-notify';
import { sendCourseEnrolledEmail } from '@/lib/email';
import { trackEvent } from '@/lib/events/track';
import { getActivePrograms, isProgramSlugActiveInCatalog } from '@/lib/platform/programCatalog';
import { memberTrainingProfileComplete } from '@/lib/platform/trainingEnrollmentGate';
import { awardPoints } from '@/lib/member/points';

export async function POST(request: Request) {
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

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      enrolledProgram: true,
      phone: true,
      profile: { select: { profilePhone: true, profileAddress: true, financialAidInterest: true } },
      courseEnrollment: { select: { enrolledByAdminId: true } },
    },
  });

  const adminBypass = !!existing?.courseEnrollment?.enrolledByAdminId;

  const gate = memberTrainingProfileComplete({
    phone: existing?.phone,
    profilePhone: existing?.profile?.profilePhone,
    profileAddress: existing?.profile?.profileAddress,
    financialAidInterest: existing?.profile?.financialAidInterest,
  });
  if (!adminBypass && !gate.ok) {
    return NextResponse.json(
      {
        error: 'Complete your profile to enroll in training',
        code: 'PROFILE_INCOMPLETE',
        missing: gate.missing,
      },
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
    await tx.courseEnrollment.upsert({
      where: { userId: user.id },
      create: {
        organizationId: u.organizationId,
        userId: user.id,
        programSlug: slug,
        enrolledAt: now,
        enrolledByAdminId: null,
      },
      update: {
        programSlug: slug,
        enrolledAt: now,
        enrolledByAdminId: null,
      },
    });
    return u;
  });

  awardPoints(user.id, 'program_enrolled', slug).catch(() => {});

  // Lifecycle event: program_enrolled
  trackEvent({
    userId: user.id,
    eventName: 'program_enrolled',
    entityType: 'Program',
    entityId: slug,
    metadata: { programTitle },
  }).catch(() => {});

  sendPartnerMilestoneEmail(user.id, 'Program enrollment', {
    Program: programTitle,
  }).catch((err) => console.error('Partner milestone email failed:', err));

  sendCourseEnrolledEmail({
    to: updatedUser.email,
    fullName: updatedUser.fullName,
    programName: programTitle,
  }).catch((err) => console.error('Course enrolled email failed:', err));

  return NextResponse.json({ ok: true, programSlug: slug });
}
