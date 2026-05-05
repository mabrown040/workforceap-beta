import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: employerId } = await params;
  const employer = await prisma.employer.findUnique({ where: { id: employerId } });
  if (!employer) return NextResponse.json({ error: 'Employer not found' }, { status: 404 });
  if (employer.status !== 'active') {
    return NextResponse.json({ error: 'Employer is already inactive' }, { status: 400 });
  }

  await prisma.employer.update({
    where: { id: employerId },
    data: { status: 'inactive' },
  });

  return NextResponse.json({ ok: true, status: 'inactive' });
}
