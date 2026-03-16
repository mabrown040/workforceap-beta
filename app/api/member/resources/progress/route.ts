import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const progress = await prisma.resourceProgress.findMany({
    where: { userId: user.id },
  });
  const byResource = Object.fromEntries(progress.map((p) => [p.resourceId, p]));
  return NextResponse.json({ progress: byResource });
}
