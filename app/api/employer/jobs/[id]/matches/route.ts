import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employerCtx = await getEmployerForUser(user.id);
    if (!employerCtx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: jobId } = await ctx.params;

    const job = await prisma.job.findFirst({
      where: { id: jobId, employerId: employerCtx.employerId },
      select: { id: true, title: true },
    });
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const matches = await prisma.aIJobMatch.findMany({
      where: { jobId },
      orderBy: { matchScore: 'desc' },
      include: {
        student: { select: { id: true, fullName: true, email: true, enrolledProgram: true } },
      },
    });

    return NextResponse.json({ job, matches });
  } catch (error) {
    console.error('[api/employer/jobs/matches] unexpected error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
