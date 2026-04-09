import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { PROGRAMS } from '@/lib/content/programs';

/**
 * GET /api/admin/onet/auto-match?onetCode=xx-xxxx.xx
 *
 * Returns a scored list of WorkforceAP program matches for the given O*NET
 * occupation code, using the locally-cached occupation description and skills.
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const onetCode = request.nextUrl.searchParams.get('onetCode')?.trim();
  if (!onetCode) return NextResponse.json({ error: 'onetCode required' }, { status: 400 });

  // Load occupation with related skills and tasks from local cache
  const occ = await prisma.onetOccupation.findUnique({
    where: { onetCode },
    include: {
      skills: { select: { skillName: true } },
      tasks: { select: { taskText: true } },
    },
  });

  if (!occ) {
    return NextResponse.json({
      matches: [],
      hint: 'Occupation not in local cache. Click "Sync from O*NET" first, then try again.',
    });
  }

  // Build a bag-of-words from occupation metadata
  const occText = [
    occ.title,
    occ.description ?? '',
    occ.jobFamily ?? '',
    occ.outlookSummary ?? '',
    occ.skills.map((s) => s.skillName).join(' '),
    occ.tasks.map((t) => t.taskText).join(' '),
  ]
    .join(' ')
    .toLowerCase();

  // Score each program by keyword overlap
  const matches = PROGRAMS.map((prog) => {
    const progKeywords = [
      prog.title,
      prog.category,
      prog.categoryLabel,
      ...prog.skills,
      prog.partner,
    ]
      .join(' ')
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3);

    const uniqueKw = [...new Set(progKeywords)];
    const hits = uniqueKw.filter((kw) => occText.includes(kw));
    const score = uniqueKw.length > 0 ? hits.length / uniqueKw.length : 0;

    let recommendationType: 'primary' | 'bridge' | 'stretch';
    if (score >= 0.25) recommendationType = 'primary';
    else if (score >= 0.1) recommendationType = 'bridge';
    else recommendationType = 'stretch';

    const matchedTerms = hits.slice(0, 5);
    const reason =
      hits.length > 0
        ? `${hits.length} keyword match${hits.length !== 1 ? 'es' : ''}: ${matchedTerms.join(', ')}${hits.length > 5 ? ', …' : ''}.`
        : 'Low keyword overlap — stretch recommendation based on adjacent skills.';

    return {
      programSlug: prog.slug,
      programTitle: prog.title,
      score: Math.round(score * 1000) / 1000,
      reason,
      recommendationType,
      experienceBand: 'beginner' as const,
    };
  });

  // Return top 8 matches sorted by score
  const ranked = matches
    .filter((m) => m.score >= 0.04)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return NextResponse.json({ matches: ranked });
}
