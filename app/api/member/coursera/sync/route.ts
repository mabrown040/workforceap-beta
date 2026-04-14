import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { resolveCourseraProgramId, resolveCourseraSkillsetIds, getCourseraReadiness } from '@/lib/coursera/config';
import { fetchCourseraLearnerSkillsetProgress } from '@/lib/coursera/client';

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enrolledProgram: true },
  });

  const enrolledProgram = dbUser?.enrolledProgram ?? null;
  const readiness = getCourseraReadiness(enrolledProgram);
  if (!readiness.canSync) {
    return NextResponse.json(
      {
        error: 'Coursera sync is not configured yet',
        missing: readiness.syncMissing,
      },
      { status: 503 }
    );
  }

  try {
    const programId = resolveCourseraProgramId(enrolledProgram);
    const skillsetIds = resolveCourseraSkillsetIds(enrolledProgram);
    const progress = await fetchCourseraLearnerSkillsetProgress({
      programId,
      externalUserId: user.id,
      email: user.email ?? '',
      skillsetIds,
    });

    const total = progress.elements.length;
    const completed = progress.elements.filter((item) => item.progressPercent >= 100).length;
    const averagePercent =
      total > 0
        ? Math.round(progress.elements.reduce((sum, item) => sum + item.progressPercent, 0) / total)
        : 0;

    return NextResponse.json({
      syncedAt: new Date().toISOString(),
      source: 'coursera-enterprise',
      learner: {
        learnerName: progress.learnerName,
        learnerEmail: progress.learnerEmail,
        learnerExternalUserId: progress.learnerExternalUserId,
      },
      progress: {
        totalSkillsets: total,
        completedSkillsets: completed,
        averagePercent,
        elements: progress.elements,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sync Coursera progress';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
