import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { captureApiError } from '@/lib/observability/captureApiError';

/** Public job detail - only live jobs */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const job = await prisma.job.findFirst({
      where: { id, status: 'live' },
      include: {
        employer: { select: { companyName: true } },
      },
    });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    return NextResponse.json(job);
  } catch (err) {
    captureApiError(err, { route: 'dashboard/jobs/[id]' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
