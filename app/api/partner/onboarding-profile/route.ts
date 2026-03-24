import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  name: z.string().min(1).max(200),
  organizationType: z.string().max(100).optional().nullable(),
  contactName: z.string().max(200).optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
});

export async function PATCH(request: NextRequest) {
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

  await prisma.partner.update({
    where: { id: ctx.partnerId },
    data: {
      name: name.trim(),
      organizationType: organizationType?.trim() || null,
      contactName: contactName?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
    },
  });

  return NextResponse.json({ ok: true });
}
