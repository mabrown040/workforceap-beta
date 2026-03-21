import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUser } from '@/lib/auth/server';
import { isSuperAdmin, SUPER_ADMIN_EMPLOYER_COOKIE } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const bodySchema = z.object({
  employerId: z.string().uuid().nullable(),
});

const cookieOpts = {
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};

/** Super-admin only: choose which employer portal company to view (or clear). */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isSuperAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const store = await cookies();
  const id = store.get(SUPER_ADMIN_EMPLOYER_COOKIE)?.value;
  if (!id) return NextResponse.json({ employer: null });

  const employer = await prisma.employer.findFirst({
    where: { id, status: 'active' },
    select: { id: true, companyName: true },
  });
  return NextResponse.json({ employer });
}

export async function POST(request: NextRequest) {
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

  const employer = await prisma.employer.findFirst({
    where: { id: parsed.data.employerId, status: 'active' },
    select: { id: true, companyName: true },
  });
  if (!employer) return NextResponse.json({ error: 'Employer not found' }, { status: 404 });

  store.set(SUPER_ADMIN_EMPLOYER_COOKIE, employer.id, cookieOpts);
  return NextResponse.json({ ok: true, employer });
}
