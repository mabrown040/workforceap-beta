import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { PROGRAMS } from '@/lib/content/programs';
import { rankPrograms } from '@/lib/career/autoMatch';

/**
 * GET /api/admin/onet/auto-match?onetCode=xx-xxxx.xx
 *
 * Returns a scored list of WorkforceAP program matches for the given O*NET
 * occupation code, using the locally-cached occupation description, skills,
 * tasks, and technology skills.
 *
 * Scoring logic lives in `lib/career/autoMatch.ts` so it can be unit tested.
 */
export async function GET(request: NextRequest) {
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
  const occ = await prisma.onetOccupation.findUnique({
    where: { onetCode },
    include: {
      skills: { select: { skillName: true } },
      tasks: { select: { taskText: true } },
      technologies: { select: { technologyName: true } },
    },
  });

  if (!occ) {
    return NextResponse.json({
      matches: [],
      hint: 'Occupation not in local cache. Click "Sync from O*NET" first, then try again.',
    });
  }

  const ranked = rankPrograms(occ, PROGRAMS);
  return NextResponse.json({ matches: ranked });

  } catch (error) {
    console.error('/admin/onet/auto-match error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

