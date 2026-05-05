import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { replayPendingXapiStatements } from '@/lib/coursera/replayPendingXapi';
import { refreshMemberProgramProgressRollup } from '@/lib/member/courseProgress';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function requireAdminUser() {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) return null;
  return user;
}

/**
 * POST /api/admin/coursera/sync-progress
 *
 * Two-phase admin-triggered training sync:
 * 1. Replay any pending xAPI statements that haven't been processed yet.
 * 2. Re-run the progress rollup for every member who has CourseProgress rows
 *    so User.coursesCompleted JSON is up to date for counselor/partner views.
 */
export async function POST() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Phase 1: drain unprocessed xAPI statements
  const xapi = await replayPendingXapiStatements(500);

  // Phase 2: backfill rollup for all members with existing CourseProgress rows
  const membersWithProgress = await prisma.courseProgress.findMany({
    where: { userId: { not: undefined } },
    select: { userId: true, programSlug: true },
    distinct: ['userId', 'programSlug'],
  });

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
    rollups: { run: rollupsRun, errors: rollupErrors, total: membersWithProgress.length },
  });
}
