import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUser } from '@/lib/auth/server';
import { isSuperAdmin, SUPER_ADMIN_EMPLOYER_COOKIE } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const bodySchema = z.object({
  employerId: z.string().uuid().nullable(),
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
    const id = store.get(SUPER_ADMIN_EMPLOYER_COOKIE)?.value;
    if (!id) return NextResponse.json({ employer: null });

    const employer = await prisma.$transaction((tx) => tx.employer.findFirst({
      where: { id, status: 'active' },
      select: { id: true, companyName: true },
    }));
    return NextResponse.json({ employer });
  } catch (error) {
    console.error('[admin/employer-context GET] error:', error);
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
    if (!parsed.data.employerId) {
      store.delete(SUPER_ADMIN_EMPLOYER_COOKIE);
      return NextResponse.json({ ok: true, employer: null });
    }

    const employerId = parsed.data.employerId;
    const employer = await prisma.$transaction((tx) => tx.employer.findFirst({
      where: { id: employerId },
      select: { id: true, companyName: true, status: true },
    }));
    if (!employer) return NextResponse.json({ error: 'Employer not found' }, { status: 404 });
    if (employer.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active employers can be opened in the employer portal preview.' },
        { status: 409 }
      );
    }

    store.set(SUPER_ADMIN_EMPLOYER_COOKIE, employer.id, cookieOpts);
    return NextResponse.json({ ok: true, employer: { id: employer.id, companyName: employer.companyName } });
  } catch (error) {
    console.error('[admin/employer-context POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
