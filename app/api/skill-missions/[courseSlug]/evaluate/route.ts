import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { prisma } from '@/lib/db/prisma';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import {
  evaluateSkillMission,
  MissionEvalUnavailableError,
} from '@/lib/ai/skillMissionEval';
import {
  recordMissionResult,
  recordMissionSubmission,
  countRecentMissionSubmissions,
} from '@/lib/member/skillMissions';
import {
  buildSkillMissionEventKey,
  parseSkillMissionEventKey,
  resolveSkillMissionAssignment,
  resolveSkillMissionForCurriculum,
} from '@/lib/member/skillMissionCurriculum';
import { programSlugReadCandidates } from '@/lib/content/programSlug';
import type { MissionEvalResponse } from '@/lib/ai/skillMissionEval';

const MAX_ATTEMPTS_PER_DAY = 5;

/* No `correct` flag and no programSlug from the client: the quiz is graded
   server-side against the catalog, and the program is bound to the member's
   enrollment. */
const bodySchema = z.object({
  missionKey: z.string().min(1).max(300),
  quizAnswers: z
    .array(
      z.object({
        questionIndex: z.number().int().min(0).max(2),
        selectedIndex: z.number().int().min(0).max(3),
      })
    )
    .length(3),
  scenarioResponse: z.string().min(20).max(4000),
});

function fail(error: string, status: number) {
  return NextResponse.json({ ok: false, error } satisfies MissionEvalResponse, { status });
}

export const POST = withApiGuc(
  async (
    request: NextRequest,
    context: { params: Promise<{ courseSlug: string }> }
  ) => {
    try {
      // 1. Auth
      const user = await getUser();
      if (!user) return fail('Unauthorized', 401);

      // 2. Rate limit — this endpoint makes up to 2 LLM round-trips per call
      const { success: withinRateLimit } = await checkAIToolRateLimit(user.id);
      if (!withinRateLimit) {
        return fail('Rate limit exceeded. Please try again in a few minutes.', 429);
      }

      // 3. Validate body
      let rawBody: unknown;
      try {
        rawBody = await request.json();
      } catch {
        return fail('Invalid JSON', 400);
      }
      const parsed = bodySchema.safeParse(rawBody);
      if (!parsed.success) {
        return fail(parsed.error.errors[0]?.message ?? 'Validation failed', 400);
      }
      const { missionKey, quizAnswers, scenarioResponse } = parsed.data;
      const requestedMission = parseSkillMissionEventKey(missionKey);
      if (!requestedMission) return fail('Mission not found', 404);

      // Each question must be answered exactly once
      const answeredIndexes = new Set(quizAnswers.map((a) => a.questionIndex));
      if (answeredIndexes.size !== 3) {
        return fail('Each quiz question must be answered exactly once.', 400);
      }

      const { courseSlug } = await context.params;

      // 4. Bind the program to the member's enrollment — never to the body
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
        return fail('You must be enrolled in a program to attempt skill missions.', 403);
      }
      const { programSlug, curriculumVersion } = assignment;

      // 5. Look up the mission for (enrolled program, course) and verify the
      //    client is talking about the same mission
      const resolvedMission = resolveSkillMissionForCurriculum({
        programSlug,
        curriculumVersion,
        missionCourseSlug: courseSlug,
      });
      const expectedMissionKey = resolvedMission
        ? buildSkillMissionEventKey({
            programSlug,
            curriculumVersion,
            missionCourseSlug: resolvedMission.definition.courseSlug,
          })
        : null;
      if (!resolvedMission || expectedMissionKey !== missionKey) {
        return fail('Mission not found', 404);
      }
      const missionDef = resolvedMission.definition;

      // 6. Verify the student has completed this course
      const progress = await prisma.$transaction((tx) => tx.courseProgress.findFirst({
        where: {
          userId: user.id,
          programSlug: { in: programSlugReadCandidates(programSlug) },
          courseSlug: { in: resolvedMission.unlockSlugs },
          status: 'COMPLETED',
        },
        select: { id: true },
      }));
      if (!progress) {
        return fail('You must complete this course before attempting its skill mission.', 403);
      }

      // 7. Per-mission daily attempt cap (counts AI-failed attempts too)
      const recentAttempts = await countRecentMissionSubmissions({
        userId: user.id,
        programSlug,
        curriculumVersion,
        courseSlug,
        sinceHours: 24,
      });
      if (recentAttempts >= MAX_ATTEMPTS_PER_DAY) {
        return fail(
          'Daily attempt limit reached for this mission. Take a break and come back tomorrow.',
          429
        );
      }
      await recordMissionSubmission({
        userId: user.id,
        programSlug,
        curriculumVersion,
        courseSlug,
        assignedCourseSlug: resolvedMission.assignedCourseSlug,
      });

      // 8. Grade the quiz server-side against the catalog
      const quizCorrectCount = quizAnswers.reduce((count, answer) => {
        const question = missionDef.quizQuestions[answer.questionIndex];
        return question && question.correctIndex === answer.selectedIndex ? count + 1 : count;
      }, 0);

      // 9. Run AI evaluation (throws MissionEvalUnavailableError on AI failure
      //    — nothing is persisted in that case)
      let evalResult;
      try {
        evalResult = await evaluateSkillMission({
          courseSlug: resolvedMission.assignedCourseSlug,
          programSlug,
          missionKey,
          courseTitle: missionDef.courseTitle,
          skillLabels: missionDef.skillLabels,
          scenarioPrompt: missionDef.scenarioPrompt,
          evidenceHint: missionDef.evidenceHint,
          quizCorrectCount,
          quizTotal: missionDef.quizQuestions.length,
          scenarioResponse,
          userId: user.id,
        });
      } catch (evalErr) {
        if (evalErr instanceof MissionEvalUnavailableError) {
          return fail(
            'Our coach is taking a quick break — your attempt was not graded. Please try again in a few minutes.',
            503
          );
        }
        throw evalErr;
      }

      // 10. Record the verdict event
      try {
        await recordMissionResult({
          userId: user.id,
          courseSlug,
          programSlug,
          curriculumVersion,
          assignedCourseSlug: resolvedMission.assignedCourseSlug,
          result: {
            verdict: evalResult.verdict,
            coachingNote: evalResult.coachingNote,
            starStory: evalResult.starStory,
            resumeBullet: evalResult.resumeBullet,
            skillsUnlocked: evalResult.skillsUnlocked,
          },
          aiToolResultId: evalResult.aiToolResultId,
        });
      } catch (recordErr) {
        // Non-fatal — log but don't fail the response
        console.error('[skill-missions/evaluate] recordMissionResult failed:', recordErr instanceof Error ? recordErr.message : recordErr);
      }

      // 11. Return the evaluation result
      const response: MissionEvalResponse = {
        ok: true,
        verdict: evalResult.verdict,
        coachingNote: evalResult.coachingNote,
        starStory: evalResult.starStory,
        resumeBullet: evalResult.resumeBullet,
        skillsUnlocked: evalResult.skillsUnlocked,
        quizCorrectCount,
        aiToolResultId: evalResult.aiToolResultId,
      };
      return NextResponse.json(response);
    } catch (err) {
      console.error('[skill-missions/evaluate] unhandled error:', err instanceof Error ? err.message : err);
      return fail('Internal server error', 500);
    }
  }
);
