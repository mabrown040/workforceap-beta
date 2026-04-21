import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';

/**
 * POST /api/counselor/remind-member
 * Logs a reminder action for an inactive member.
 * Body: { userId, daysInactive }
 * 
 * Future: Can integrate with email/SMS service to actually send reminders.
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { role: true },
  });

  const isStaff = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'counselor';
  if (!isStaff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const memberId = typeof body.userId === 'string' ? body.userId : '';
  const daysInactive = typeof body.daysInactive === 'number' ? body.daysInactive : 0;

  if (!memberId) {
    return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
  }

  // Log the reminder action as a member event
  await prisma.$executeRaw`
    INSERT INTO member_events (id, user_id, event_name, entity_type, entity_id, metadata, created_at)
    VALUES (
      gen_random_uuid(),
      ${memberId},
      'reminder_sent',
      'counselor_action',
      ${user.id},
      ${JSON.stringify({ daysInactive, sentBy: user.id, sentAt: new Date().toISOString() })},
      NOW()
    )
  `;

  // TODO: Integrate with email service (Resend, SendGrid, etc.) to send actual reminder
  // TODO: Integrate with SMS if member has phone and sms_opt_in

  return NextResponse.json({ ok: true, message: 'Reminder logged. Email/SMS integration pending.' });
}
