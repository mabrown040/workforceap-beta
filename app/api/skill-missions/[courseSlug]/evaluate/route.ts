import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { prisma } from '@/lib/db/prisma';
import { evaluateSkillMission } from '@/lib/ai/skillMissionEval';
import { getSkillMissionDefinition } from '@/lib/content/skillMissionCatalog';
import { recordMissionResult } from '@/lib/member/skillMissions';
import type { MissionEvalResponse } from '@/lib/ai/skillMissionEval';

const bodySchema = z.object({
  programSlug: z.string().min(1).max(160),
  missionKey: z.string().min(1).max(300),
  quizAnswers: z
    .array(
      z.object({
        questionIndex: z.number().int().min(0).max(2),
        selectedIndex: z.number().int().min(0).max(3),
        correct: z.boolean(),
      })
    )
    .length(3),
  scenarioResponse: z.string().min(20).max(4000),
});

export const POST = withApiGuc(
  async (
    request: NextRequest,
    context: { params: Promise<{ courseSlug: string }> }
  ) => {
    try {
      // 1. Auth check
      const user = await getUser();
      if (!user) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' } satisfies MissionEvalResponse, {
          status: 401,
        });
      }

      // 2. Validate body
      let rawBody: unknown;
      try {
        rawBody = await request.json();
      } catch {
        return NextResponse.json({ ok: false, error: 'Invalid JSON' } satisfies MissionEvalResponse, {
          status: 400,
        });
      }

      const parsed = bodySchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json(
          {
            ok: false,
            error: parsed.error.errors[0]?.message ?? 'Validation failed',
          } satisfies MissionEvalResponse,
          { status: 400 }
        );
      }

      const { programSlug, missionKey, quizAnswers, scenarioResponse } = parsed.data;

      // 3. Resolve courseSlug from route params
      const { courseSlug } = await context.params;

      // 4. Look up the mission definition from the catalog
      const missionDef = getSkillMissionDefinition(courseSlug, missionKey);
      if (!missionDef) {
        return NextResponse.json(
          { ok: false, error: 'Mission not found' } satisfies MissionEvalResponse,
          { status: 404 }
        );
      }

      // 5. Verify the student has completed this course
      const progress = await prisma.courseProgress.findFirst({
        where: {
          userId: user.id,
          courseSlug,
          status: 'COMPLETED',
        },
        select: { id: true },
      });

      if (!progress) {
        return NextResponse.json(
          {
            ok: false,
            error: 'You must complete this course before attempting its skill mission.',
          } satisfies MissionEvalResponse,
          { status: 403 }
        );
      }

      // 6. Run AI evaluation
      const evalResult = await evaluateSkillMission({
        courseSlug,
        programSlug,
        missionKey,
        courseTitle: missionDef.courseTitle,
        skillLabels: missionDef.skillLabels,
        scenarioPrompt: missionDef.scenarioPrompt,
        evidenceHint: missionDef.evidenceHint,
        quizAnswers,
        scenarioResponse,
        userId: user.id,
      });

      // 7. Record the mission attempt event
      try {
        await recordMissionResult({
          userId: user.id,
          courseSlug,
          programSlug,
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

      // 8. Return the evaluation result
      const response: MissionEvalResponse = {
        ok: true,
        verdict: evalResult.verdict,
        coachingNote: evalResult.coachingNote,
        starStory: evalResult.starStory,
        resumeBullet: evalResult.resumeBullet,
        skillsUnlocked: evalResult.skillsUnlocked,
        aiToolResultId: evalResult.aiToolResultId,
      };

      return NextResponse.json(response);
    } catch (err) {
      console.error('[skill-missions/evaluate] unhandled error:', err instanceof Error ? err.message : err);
      return NextResponse.json(
        { ok: false, error: 'Internal server error' } satisfies MissionEvalResponse,
        { status: 500 }
      );
    }
  }
);
