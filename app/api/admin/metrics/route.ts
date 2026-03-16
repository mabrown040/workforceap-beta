import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getAdminMetrics } from '@/lib/admin/metrics';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminRole = await prisma.userRole.findFirst({
    where: { userId: user.id },
    include: { role: true },
  });
  if (adminRole?.role?.name !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const metrics = await getAdminMetrics();
  return NextResponse.json(metrics);
}
