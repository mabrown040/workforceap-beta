import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const schema = z.object({
  name: z.string().min(1).max(200),
  organizationType: z.string().max(100).optional().nullable(),
  contactName: z.string().max(200).optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
});export const PATCH = withApiGuc(async (request: NextRequest) => {
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

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const { name, organizationType, contactName, contactPhone } = parsed.data;

  await prisma.$transaction((tx) => tx.partner.update({
    where: { id: ctx.partnerId },
    data: {
      name: name.trim(),
      organizationType: organizationType?.trim() || null,
      contactName: contactName?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
    },
  }));

  return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('/partner/onboarding-profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

