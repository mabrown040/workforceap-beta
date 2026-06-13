import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUser } from '@/lib/auth/server';
import { isSuperAdmin, SUPER_ADMIN_PARTNER_COOKIE } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const bodySchema = z.object({
  partnerId: z.string().uuid().nullable(),
});

const cookieOpts = {
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};async function _GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSuperAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const store = await cookies();
    const id = store.get(SUPER_ADMIN_PARTNER_COOKIE)?.value;
    if (!id) return NextResponse.json({ partner: null });

    const partner = await prisma.$transaction((tx) => tx.partner.findFirst({
      where: { id, active: true },
      select: { id: true, name: true },
    }));
    return NextResponse.json({ partner });
  } catch (error) {
    console.error('[admin/partner-context GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSuperAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid body' }, { status: 400 });
    }

    const store = await cookies();
    if (!parsed.data.partnerId) {
      store.delete(SUPER_ADMIN_PARTNER_COOKIE);
      return NextResponse.json({ ok: true, partner: null });
    }

    const partnerId = parsed.data.partnerId;
    const partner = await prisma.$transaction((tx) => tx.partner.findFirst({
      where: { id: partnerId },
      select: { id: true, name: true, active: true },
    }));
    if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    if (!partner.active) {
      return NextResponse.json(
        { error: 'Only active partners can be opened in the partner portal preview.' },
        { status: 409 }
      );
    }

    store.set(SUPER_ADMIN_PARTNER_COOKIE, partner.id, cookieOpts);
    return NextResponse.json({ ok: true, partner: { id: partner.id, name: partner.name } });
  } catch (error) {
    console.error('[admin/partner-context POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
