import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, ApiError } from '@/lib/api/errors';

/** Public job detail - only live jobs */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await prisma.job.findFirst({
      where: { id, status: 'live' },
      include: {
        employer: { select: { companyName: true } },
      },
    });
    if (!job) throw ApiError.notFound('Job not found');
    return NextResponse.json(job);
  } catch (error) {
    return handleApiError(error, 'GET /api/jobs/[id]');
  }
}
