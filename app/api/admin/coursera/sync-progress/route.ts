import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { replayPendingXapiStatements } from '@/lib/coursera/replayPendingXapi';
import { promoteCsvProgressToCanonical } from '@/lib/coursera/csvImport.server';
import { refreshMemberProgramProgressRollup } from '@/lib/member/courseProgress';

import { withApiGuc } from '@/lib/db/withRequestGuc';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function requireAdminUser() {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) return null;
  return user;
}export const POST = withApiGuc(async () => {
  try {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Phase 1: drain unprocessed xAPI statements
  const xapi = await replayPendingXapiStatements(500);

  // Phase 2: promote all CSV-imported Coursera progress into course_progress
  // so member dashboards reflect CSV data even when no xAPI statements arrived
  const csvPromotion = await promoteCsvProgressToCanonical();

  // Phase 3: backfill rollup for all members with existing CourseProgress rows
  const membersWithProgress = await prisma.$transaction((tx) => tx.courseProgress.findMany({
    where: { userId: { not: undefined } },
    select: { userId: true, programSlug: true },
    distinct: ['userId', 'programSlug'],
    take: 100,
  }));

  let rollupsRun = 0;
  let rollupErrors = 0;

  for (const { userId, programSlug } of membersWithProgress) {
    try {
      await refreshMemberProgramProgressRollup(userId, programSlug);
      rollupsRun++;
    } catch {
      rollupErrors++;
    }
  }

  return NextResponse.json({
    xapi,
    csvPromotion,
    rollups: { run: rollupsRun, errors: rollupErrors, total: membersWithProgress.length },
  });

  } catch (error) {
    console.error('/admin/coursera/sync-progress error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

