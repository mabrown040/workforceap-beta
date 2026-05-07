import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import {
  resolveCourseraProgramId,
  resolveCourseraSkillsetIds,
  getCourseraReadiness,
  getCourseraSkillsetSlugOverrides,
} from '@/lib/coursera/config';
import { fetchCourseraLearnerSkillsetProgress } from '@/lib/coursera/client';
import { getProgramBySlug } from '@/lib/content/programs';
import { completeMemberCourse } from '@/lib/member/courseCompletion';
import { resolveCompletedCourseSlugsFromEnterpriseSkillsets } from '@/lib/member/courseraSkillsetMerge';
import { countCompletedInProgram } from '@/lib/member/courseraCourseProgress';
import { parseCourseSlugList } from '@/lib/member/parseCourseSlugList';

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enrolledProgram: true, coursesCompleted: true },
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

  const program = enrolledProgram ? getProgramBySlug(enrolledProgram) : null;
  if (!program || !enrolledProgram) {
    return NextResponse.json({ error: 'No program enrolled' }, { status: 400 });
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
    const completedSkillsets = progress.elements.filter((item) => item.progressPercent >= 100).length;
    const averagePercent =
      total > 0
        ? Math.round(progress.elements.reduce((sum, item) => sum + item.progressPercent, 0) / total)
        : 0;

    const skillsetMerge = resolveCompletedCourseSlugsFromEnterpriseSkillsets({
      program,
      orderedSkillsetIds: skillsetIds,
      elements: progress.elements,
      skillsetSlugOverrides: getCourseraSkillsetSlugOverrides(enrolledProgram),
    });

    const mergedCourses: Array<{ courseSlug: string; ok: boolean; alreadyCompleted?: boolean; error?: string }> = [];
    for (const slug of skillsetMerge.courseSlugs) {
      try {
        const result = await completeMemberCourse({
          userId: user.id,
          courseSlug: slug,
          source: 'coursera-enterprise-sync',
          notify: false,
        });
        mergedCourses.push({
          courseSlug: slug,
          ok: true,
          alreadyCompleted: result.alreadyCompleted,
        });
      } catch (err) {
        mergedCourses.push({
          courseSlug: slug,
          ok: false,
          error: err instanceof Error ? err.message : 'Unable to merge completion',
        });
      }
    }

    const refreshed = await prisma.user.findUnique({
      where: { id: user.id },
      select: { coursesCompleted: true },
    });
    const mergedCompletedCount = countCompletedInProgram(program, parseCourseSlugList(refreshed?.coursesCompleted));

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
        completedSkillsets,
        averagePercent,
        elements: progress.elements,
        pagesFetched: progress.pagesFetched ?? 1,
      },
      merged: {
        coursesAttempted: mergedCourses.length,
        details: mergedCourses,
        completedCoursesInProgram: mergedCompletedCount,
        totalCoursesInProgram: program.courses.length,
        unmatchedCompletedSkillsets: skillsetMerge.unmatchedCompletedSkillsets,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sync Coursera progress';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
