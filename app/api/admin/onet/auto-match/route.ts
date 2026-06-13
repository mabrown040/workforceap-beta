import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { PROGRAMS } from '@/lib/content/programs';
import { rankPrograms } from '@/lib/career/autoMatch';
import { refineMatchesWithLlm } from '@/lib/career/autoMatchLlmRefine';

import { withApiGuc } from '@/lib/db/withRequestGuc';

export const GET = withApiGuc(async (request: NextRequest) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const onetCode = request.nextUrl.searchParams.get('onetCode')?.trim();
  if (!onetCode) return NextResponse.json({ error: 'onetCode required' }, { status: 400 });

  // Load occupation with related skills, tasks, and technologies from local cache
  const occ = await prisma.$transaction((tx) => tx.onetOccupation.findUnique({
    where: { onetCode },
    include: {
      skills: { select: { skillName: true } },
      tasks: { select: { taskText: true } },
      technologies: { select: { technologyName: true } },
    },
  }));

  if (!occ) {
    return NextResponse.json({
      matches: [],
      hint: 'Occupation not in local cache. Click "Sync from O*NET" first, then try again.',
    });
  }

  // Build OccupationForMatch with taxonomy fields from rawJson when available
  const raw = (occ.rawJson ?? {}) as {
    overview?: { tags?: { job_zone?: string } };
    abilities?: { name: string; importance: number | null; level: number | null }[];
    knowledge?: { name: string; importance: number | null; level: number | null }[];
    workActivities?: { name: string; importance: number | null; level: number | null }[];
    education?: { title: string; category: string; percent?: number | null; required?: boolean | null }[];
    sampleTitles?: { title: string; shortTitle?: boolean }[];
  };

  const occupationForMatch = {
    title: occ.title,
    description: occ.description,
    jobFamily: occ.jobFamily,
    outlookSummary: occ.outlookSummary,
    jobZone: raw.overview?.tags?.job_zone ? parseInt(raw.overview.tags.job_zone, 10) || null : null,
    skills: occ.skills.map((s) => ({ skillName: s.skillName })),
    tasks: occ.tasks.map((t) => ({ taskText: t.taskText })),
    technologies: occ.technologies.map((t) => ({ technologyName: t.technologyName })),
    abilities: raw.abilities,
    knowledge: raw.knowledge,
    workActivities: raw.workActivities,
    education: raw.education,
    sampleTitles: raw.sampleTitles,
  };

  const ranked = rankPrograms(occupationForMatch, PROGRAMS);

  const useLlm = request.nextUrl.searchParams.get('llm') === 'true';
  const finalMatches = useLlm ? await refineMatchesWithLlm(occupationForMatch, ranked.slice(0, 5), PROGRAMS) : ranked;

  return NextResponse.json({ matches: finalMatches });

  } catch (error) {
    console.error('/admin/onet/auto-match error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

