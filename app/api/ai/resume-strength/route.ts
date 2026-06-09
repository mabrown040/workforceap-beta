import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit, checkAICoachUserRateLimit, checkAICoachIpRateLimit } from '@/lib/rate-limit';
import { resumeStrengthSchema } from '@/lib/validation/resumeStrength';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { resolveActOnBehalf } from '@/lib/auth/actAsSubject';
import { cleanLongFormPlainText } from '@/lib/ai/postProcess';
import { analyzeResume, scoreStructural } from '@/lib/ai/resumeScore';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { getClientIp } from '@/lib/api-utils';
import { createApiErrorResponse, createRateLimitResponse, createServiceUnavailableResponse, createUnauthorizedResponse } from '@/lib/api-utils';
export const POST = withApiGuc(async (request: Request) => {
  try {
    const user = await getUser();
    if (!user) return createUnauthorizedResponse();
    if (!isAIConfigured()) return createServiceUnavailableResponse();

    const { success } = await checkAIToolRateLimit(user.id);
    const ip = getClientIp(request);
    const userLimit = await checkAICoachUserRateLimit(user.id);
    const ipLimit = await checkAICoachIpRateLimit(ip);
    if (!userLimit.success || !ipLimit.success) return createRateLimitResponse();
    if (!success) return createRateLimitResponse();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createApiErrorResponse('Invalid JSON', 'VALIDATION_ERROR', 400);
    }

    const parsed = resumeStrengthSchema.safeParse(body);
    if (!parsed.success) {
      return createApiErrorResponse(parsed.error.errors[0]?.message ?? 'Validation failed', 'VALIDATION_ERROR', 400);
    }

    const { resume, subjectMemberId, sessionId } = parsed.data;
    const onBehalf = await resolveActOnBehalf(user.id, subjectMemberId);
    if (!onBehalf.ok) return NextResponse.json({ error: onBehalf.error }, { status: onBehalf.status });

    // Multi-signal analysis: structural (deterministic) + O*NET coverage + market keywords + synthesis.
    // Falls back to structural-only if downstream stages fail.
    let result;
    try {
      result = await analyzeResume(resume);
    } catch (err) {
      console.error('[resume-strength] analyzeResume failed, falling back to legacy single-call:', err instanceof Error ? err.message : err);
      // Legacy fallback path
      const structural = scoreStructural(resume);
      const legacySystem = `You are an ATS-savvy career coach. Analyze the resume.\nReturn:\nOVERALL SCORE: <0-100>%\nSTRENGTHS:\n• ...\nPRIORITY IMPROVEMENTS:\n• ...\nQUICK WINS:\n• ...`;
      const legacy = await chatCompletion(
        [
          { role: 'system', content: legacySystem },
          { role: 'user', content: `Resume:\n${resume}` },
        ],
        { maxTokens: 1400, temperature: 0.45 },
      );
      result = {
        composite: structural.composite,
        pillars: {
          structural: { score: structural.composite, label: 'Structure & ATS basics' },
          onetCoverage: null,
          marketCoverage: null,
        },
        structural,
        occupations: [],
        onetCoverage: [],
        marketCoverage: [],
        narrative: legacy,
        diagnostics: { structuralMs: 0, occupationsMs: 0, onetMs: 0, marketMs: 0, synthesisMs: 0 },
      } as Awaited<ReturnType<typeof analyzeResume>>;
    }

    if (!result.narrative) {
      return NextResponse.json({ error: 'We could not generate a response. Please try again.' }, { status: 500 });
    }

    try {
      await ensureUserInDb(user);
      await saveAIToolResult(onBehalf.subjectUserId, 'resume_analysis', 'Resume strength', result.narrative, {
        actorUserId: onBehalf.actorUserId,
        actorName: onBehalf.actorName,
        sessionId,
      });
    } catch (saveErr) {
      console.error('Resume strength: failed to save result', saveErr);
    }

    return NextResponse.json({
      output: cleanLongFormPlainText(result.narrative),
      composite: result.composite,
      pillars: result.pillars,
      structural: {
        composite: result.structural.composite,
        breakdown: result.structural.breakdown,
      },
      occupations: result.occupations,
      onetCoverage: result.onetCoverage.map((c) => ({
        onetCode: c.onetCode,
        title: c.title,
        coverageScore: c.coverageScore,
        topGaps: c.topGaps.map((g) => ({
          skill: g.skill.name,
          importance: g.skill.importance,
          bestSimilarity: g.bestSimilarity,
        })),
      })),
      marketCoverage: result.marketCoverage.map((m) => ({
        postingCount: m.postingCount,
        source: m.source,
        coverageScore: m.coverageScore,
        mustHaveMissing: m.mustHaveMissing.map((k) => ({ phrase: k.phrase, frequency: k.frequency })),
        mustHavePresent: m.mustHavePresent.map((k) => ({ phrase: k.phrase, frequency: k.frequency })),
      })),
      diagnostics: result.diagnostics,
    });
  } catch (error) {
    console.error('/ai/resume-strength:', error);
    return createApiErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
});
