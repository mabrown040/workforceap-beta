import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const rows = await prisma.programChangeRequest.findMany({
      take: 500,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, fullName: true, enrolledProgram: true } },
        reviewedBy: { select: { id: true, email: true, fullName: true } },
      },
    });

    return NextResponse.json({ requests: rows });
  } catch (error) {
    console.error('[admin/program-change-requests] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
