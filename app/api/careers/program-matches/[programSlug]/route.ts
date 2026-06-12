import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { checkPublicCareersGetRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';
import { captureApiError } from '@/lib/observability/captureApiError';

import { withApiGuc } from '@/lib/db/withRequestGuc';

type Params = { params: Promise<{ programSlug: string }> };export const GET = withApiGuc(async (request: NextRequest, { params }: Params) => {
  try {
    const ip = getClientIpFromRequest(request);
    const { success: withinLimit } = await checkPublicCareersGetRateLimit(ip);
    if (!withinLimit) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }
  
    try {
      const { programSlug: raw } = await params;
      const programSlug = decodeURIComponent(raw || '').trim();
      if (!programSlug) {
        return NextResponse.json({ error: 'Missing program slug' }, { status: 400 });
      }
  
      const program = getProgramBySlug(programSlug);
      if (!program) {
        return NextResponse.json({ error: 'Unknown program' }, { status: 404 });
      }
  
      const rows = await prisma.$transaction((tx) => tx.careerProgramMapping.findMany({
        where: { programSlug, isActive: true },
        include: {
          occupation: {
            select: {
              onetCode: true,
              title: true,
              description: true,
              jobFamily: true,
            },
          },
        },
        orderBy: [{ onetCode: 'asc' }, { experienceBand: 'asc' }, { priority: 'asc' }],
        take: 100,
      }));
  
      return NextResponse.json({
        programSlug,
        programTitle: program.title,
        occupations: rows.map((r) => ({
          onetCode: r.occupation.onetCode,
          title: r.occupation.title,
          description: r.occupation.description,
          jobFamily: r.occupation.jobFamily,
          experienceBand: r.experienceBand,
          priority: r.priority,
          recommendationType: r.recommendationType,
          whyRecommended: r.whyRecommended,
        })),
      });
    } catch (error) {
      captureApiError(error, { route: 'careers/program-matches/[programSlug]' });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  } catch (error) {
    console.error('/careers/program-matches/[programSlug]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
