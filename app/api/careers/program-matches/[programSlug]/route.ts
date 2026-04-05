import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';

type Params = { params: Promise<{ programSlug: string }> };

export async function GET(_request: Request, { params }: Params) {
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

    const rows = await prisma.careerProgramMapping.findMany({
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
    });

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
    console.error('[api/careers/program-matches] unexpected error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
