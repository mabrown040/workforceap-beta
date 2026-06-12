import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const patchSchema = z.object({
  notifyOnEnrollment: z.boolean().optional(),
  notifyOnCourse: z.boolean().optional(),
  notifyOnCertified: z.boolean().optional(),
  notifyOnPlaced: z.boolean().optional(),
});export const PATCH = withApiGuc(async (req: NextRequest) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Not a partner' }, { status: 403 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const updated = await prisma.$transaction((tx) => tx.partner.update({
    where: { id: ctx.partnerId },
    data,
    select: {
      notifyOnEnrollment: true,
      notifyOnCourse: true,
      notifyOnCertified: true,
      notifyOnPlaced: true,
    },
  }));

  return NextResponse.json({ ok: true, preferences: updated });

  } catch (error) {
    console.error('/partner/settings/notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

