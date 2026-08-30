import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { prisma } from '@/lib/db/prisma';
import {
  buildSkillMissionEventKey,
  parseSkillMissionEventKey,
  resolveSkillMissionAssignment,
  resolveSkillMissionForCurriculum,
} from '@/lib/member/skillMissionCurriculum';
import { programSlugReadCandidates } from '@/lib/content/programSlug';

/* Grades a single quiz answer so the mission modal can show instant
   feedback without correctIndex/explanation ever shipping in the page
   payload. No LLM involved — cheap, but still auth + enrollment gated.
   Revealing the explanation (and implicitly the right answer) AFTER the
   student commits to an answer is the intended learning UX. */

const bodySchema = z.object({
  missionKey: z.string().min(1).max(300),
  questionIndex: z.number().int().min(0).max(2),
  selectedIndex: z.number().int().min(0).max(3),
});

export const POST = withApiGuc(
  async (
    request: NextRequest,
    context: { params: Promise<{ courseSlug: string }> }
  ) => {
    try {
      const user = await getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      let rawBody: unknown;
      try {
        rawBody = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }
      const parsed = bodySchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
          { status: 400 }
        );
      }

      const { courseSlug } = await context.params;
      const requestedMission = parseSkillMissionEventKey(parsed.data.missionKey);
      if (!requestedMission) {
        return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
      }

      const dbUser = await prisma.$transaction((tx) => tx.user.findUnique({
        where: { id: user.id },
        select: {
          enrolledProgram: true,
          courseEnrollments: {
            select: { programSlug: true, curriculumVersion: true, isPrimary: true },
            orderBy: [{ isPrimary: 'desc' }, { enrolledAt: 'desc' }],
          },
        },
      }));
      const assignment = resolveSkillMissionAssignment({
        enrolledProgram: dbUser?.enrolledProgram,
        enrollments: dbUser?.courseEnrollments ?? [],
        requestedProgramSlug: requestedMission.programSlug,
      });
      if (!assignment) {
        return NextResponse.json({ error: 'Not enrolled in a program' }, { status: 403 });
      }

      const resolvedMission = resolveSkillMissionForCurriculum({
        programSlug: assignment.programSlug,
        curriculumVersion: assignment.curriculumVersion,
        missionCourseSlug: courseSlug,
      });
      const expectedMissionKey = resolvedMission
        ? buildSkillMissionEventKey({
            programSlug: assignment.programSlug,
            curriculumVersion: assignment.curriculumVersion,
            missionCourseSlug: resolvedMission.definition.courseSlug,
          })
        : null;
      if (!resolvedMission || expectedMissionKey !== parsed.data.missionKey) {
        return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
      }
      const missionDef = resolvedMission.definition;

      const progress = await prisma.$transaction((tx) => tx.courseProgress.findFirst({
        where: {
          userId: user.id,
          programSlug: { in: programSlugReadCandidates(assignment.programSlug) },
          courseSlug: { in: resolvedMission.unlockSlugs },
          status: 'COMPLETED',
        },
        select: { id: true },
      }));
      if (!progress) {
        return NextResponse.json(
          { error: 'You must complete this course before checking its mission quiz.' },
          { status: 403 },
        );
      }

      const question = missionDef.quizQuestions[parsed.data.questionIndex];
      if (!question) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 });
      }

      return NextResponse.json({
        correct: question.correctIndex === parsed.data.selectedIndex,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
      });
    } catch (err) {
      console.error('[skill-missions/quiz-check] error:', err instanceof Error ? err.message : err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);
