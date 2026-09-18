import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { getScoreBreakdownSafeResult } from '@/lib/readiness/score';
import { buildReadinessProgressView } from '@/lib/readiness/progressView';
import {
  READINESS_SCORE_LOAD_ERROR,
  buildFactualReadinessRecap,
  buildReadinessSummaryPrompt,
  cleanReadinessSummary,
  readinessSummaryLooksGrounded,
} from '@/lib/readiness/progressSummary';

/**
 * POST /api/member/readiness/summary
 *
 * Rewrites the member's own validated readiness numbers into a short recap.
 * Generation always reloads `getScoreBreakdownSafeResult` — the client cannot
 * submit scores. If AI is off, rate-limited, or ungrounded, return the factual
 * recap from those same numbers instead of a 503 empty state.
 */
export const POST = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const scoreResult = await getScoreBreakdownSafeResult(user.id);
    if (scoreResult.loadFailed) {
      return NextResponse.json({
        source: 'error',
        summary: READINESS_SCORE_LOAD_ERROR,
      });
    }

    const view = buildReadinessProgressView(scoreResult.breakdown);
    const factual = buildFactualReadinessRecap(view);

    if (!isAIConfigured()) {
      return NextResponse.json({ source: 'factual', summary: factual });
    }

    const { success: rateOk } = await checkAIToolRateLimit(user.id);
    if (!rateOk) {
      return NextResponse.json({ source: 'factual', summary: factual });
    }

    try {
      const prompt = buildReadinessSummaryPrompt(view);
      const output = await chatCompletion(
        [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        { maxTokens: 280, temperature: 0.2 },
      );
      const cleaned = output ? cleanReadinessSummary(output) : '';
      if (cleaned && readinessSummaryLooksGrounded(cleaned, view)) {
        return NextResponse.json({ source: 'ai', summary: cleaned });
      }
    } catch (err) {
      console.error('[api/member/readiness/summary] generation failed', err);
    }

    return NextResponse.json({ source: 'factual', summary: factual });
  } catch (error) {
    console.error('/api/member/readiness/summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
