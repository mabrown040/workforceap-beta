import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const contactSchema = z.object({
  contactName: z.string().max(200).nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
});

export const PATCH = withApiGuc(async (request: NextRequest) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await getPartnerForUser(user.id);
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const d = parsed.data;
    await prisma.$transaction((tx) => tx.partner.update({
      where: { id: ctx.partnerId },
      data: {
        contactName: d.contactName?.trim() || null,
        contactPhone: d.contactPhone?.trim() || null,
      },
    }));

    auditLog({
      actorUserId: user.id,
      action: 'partner_settings_contact_updated',
      targetType: 'User',
      targetId: user.id,
      metadata: { partnerId: ctx.partnerId },
    }).catch(() => {});
    logAuditEvent({
      user: { id: user.id, role: 'partner' },
      verb: 'updated',
      object: { type: 'PartnerContactSettings', id: ctx.partnerId },
      result: { success: true },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('/partner/settings/contact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
