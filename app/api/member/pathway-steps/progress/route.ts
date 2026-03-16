import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const progress = await prisma.pathwayStepProgress.findMany({
    where: { userId: user.id },
  });
  const byPathway = progress.reduce((acc, p) => {
    if (!acc[p.pathwayId]) acc[p.pathwayId] = [];
    acc[p.pathwayId].push(p);
    return acc;
  }, {} as Record<string, typeof progress>);
  return NextResponse.json({ progress: byPathway });
}
