import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { assertStaffCanAccessMemberRecord } from '@/lib/counselor/staffMemberAccess';
import { sendInactiveNudgeEmail } from '@/lib/email';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 5).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * The member lookup is wrapped in `withTenantScope` so a counselor from
 * Org A cannot resolve an Org B member's email/name by guessing the
 * UUID. The `MemberEvent` insert stays on raw `prisma.$executeRaw`
 * because it inherits tenancy via FK to `User` — the membership gate
 * before that insert prevents cross-tenant attribution.
 */

/**
 * POST /api/counselor/remind-member
 * Sends an inactive-nudge email to the member and logs the action.
 * Body: { userId, daysInactive }
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const memberId = typeof body.userId === 'string' ? body.userId : '';
  const daysInactive = typeof body.daysInactive === 'number' ? body.daysInactive : 0;

  if (!memberId) {
    return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
  }

  const allowed = await assertStaffCanAccessMemberRecord(user.id, memberId);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const orgId = await getActorOrganizationId(user.id);
  const member = await withTenantScope(orgId, (db) =>
    db.user.findFirst({
      where: { id: memberId },
      select: { email: true, fullName: true },
    }),
  );

  if (!member?.email) {
    return NextResponse.json({ error: 'Member has no email on file' }, { status: 400 });
  }

  const emailResult = await sendInactiveNudgeEmail({
    to: member.email,
    fullName: member.fullName ?? '',
  });

  await prisma.$executeRaw`
    INSERT INTO member_events (id, user_id, event_name, entity_type, entity_id, metadata, created_at)
    VALUES (
      gen_random_uuid(),
      ${memberId},
      'reminder_sent',
      'counselor_action',
      ${user.id},
      ${JSON.stringify({
        daysInactive,
        sentBy: user.id,
        sentAt: new Date().toISOString(),
        emailDelivered: emailResult.ok,
        emailError: emailResult.error ?? null,
      })},
      NOW()
    )
  `;

  if (!emailResult.ok) {
    return NextResponse.json(
      { ok: false, message: 'Reminder logged but email failed to send.', error: emailResult.error ?? 'Email not configured' },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, message: 'Reminder email sent.' });
}
