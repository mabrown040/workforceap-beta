import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit';
import { checkAuthRateLimit } from '@/lib/rate-limit';
import { ApplicationStatus } from '@prisma/client';
import { sendEnrollmentConfirmationEmail, sendApplicationRejectedEmail } from '@/lib/email';
import { getProgramByInterestValue } from '@/lib/content/programs';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

const statusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'DENIED', 'NEEDS_INFO']),
  notes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const ip = getClientIp(request);
  const { success: rateOk } = await checkAuthRateLimit(`admin:${ip}`);
  if (!rateOk) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { status, notes } = parsed.data;

  const application = await prisma.application.findUnique({
    where: { id },
    include: { user: { select: { email: true, fullName: true, programInterest: true } } },
  });

  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const previousStatus = application.status;

  await prisma.application.update({
    where: { id },
    data: { status, notes: notes ?? application.notes },
  });

  // Best-effort: send enrollment confirmation / rejection emails to member
  if (status === 'APPROVED') {
    const interest = application.user.programInterest ?? application.programInterest;
    const program = interest ? getProgramByInterestValue(interest) : undefined;
    const programName = program?.title ?? application.programInterest ?? 'your selected program';

    // Look up the assigned counselor so the welcome email can name them by
    // name (per /plan-design-review day-1 storyboard: members feel "Someone
    // is paying attention to me" only when that someone has a name).
    const assignment = await prisma.counselorAssignment.findFirst({
      where: { memberId: application.userId, active: true },
      include: { counselor: { include: { user: { select: { fullName: true, email: true } } } } },
    });
    const counselorName = assignment?.counselor.user.fullName ?? undefined;
    const counselorContact = assignment?.counselor.user.email ?? undefined;

    sendEnrollmentConfirmationEmail({
      to: application.user.email,
      fullName: application.user.fullName,
      programName,
      counselorName,
      counselorContact,
    }).catch((err) => console.error('Enrollment confirmation email failed:', err));
  } else if (status === 'DENIED') {
    sendApplicationRejectedEmail({
      to: application.user.email,
      fullName: application.user.fullName,
    }).catch((err) => console.error('Application rejected email failed:', err));
  }

  await auditLog({
    actorUserId: user.id,
    action: 'application_status_change',
    targetType: 'application',
    targetId: id,
    metadata: {
      previousStatus,
      newStatus: status,
      userId: application.userId,
      userEmail: application.user.email,
    },
  });

  return NextResponse.json({ success: true });

  } catch (error) {
    console.error('/admin/members/[id]/status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

