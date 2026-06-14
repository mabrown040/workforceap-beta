import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isOnetConfigured } from '@/lib/onet/client';
import { getInterestProfilerCareers, getInterestProfilerResults } from '@/lib/onet/interestProfiler';
import { applyRiasecCareerFallback } from '@/lib/onet/interestProfilerCareerFallback';
import { riasecFromResultRows } from '@/lib/content/quizIpMerge';
import { mapIpCareerRowsToProgramSlugs } from '@/lib/onet/ipMapToPrograms';
import { checkPublicInterestProfilerRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';
import { areaScoresToOnetAnswers } from '@/lib/career/careerQuizRules';
import { getMiniIpAreaOrder } from '@/lib/career/careerQuizAreas';

/**
 * PUBLIC (no-account) short career quiz scorer. Takes 6 area ratings, expands them
 * into the 30-item O*NET vector, and reuses the same scoring + career-matching the
 * full Interest Profiler uses. Stateless; IP rate-limited (shares the profiler bucket).
 */
const bodySchema = z.object({
  // One digit [1-5] per RIASEC area, in RIASEC_AREAS order.
  answers: z.string().length(6).regex(/^[1-5]{6}$/, 'Each answer must be a digit from 1 to 5.'),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIpFromRequest(request);
    const { success: rateOk } = await checkPublicInterestProfilerRateLimit(ip);
    if (!rateOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a little while.' },
        { status: 429 }
      );
    }

    if (!isOnetConfigured()) {
      return NextResponse.json(
        { error: 'Career matching tools are not configured. Ask your administrator to set ONET_API_KEY.' },
        { status: 503 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Invalid answers string';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const areaOrder = await getMiniIpAreaOrder();
    const answers = areaScoresToOnetAnswers(parsed.data.answers, areaOrder);
    if (!answers) {
      return NextResponse.json({ error: 'Could not score the quiz right now.' }, { status: 502 });
    }

    try {
      const results = await getInterestProfilerResults(answers);
      if (results.error) {
        return NextResponse.json({ error: String(results.error) }, { status: 422 });
      }
      const careersResp = await getInterestProfilerCareers(answers, { start: 1, end: 20 });
      const riasec = riasecFromResultRows(results.result ?? []);
      const careerRows = applyRiasecCareerFallback(careersResp.career ?? [], results.result ?? []);
      const programSlugs = await mapIpCareerRowsToProgramSlugs(
        careerRows.map((c) => ({ code: c.code, fit: c.fit }))
      );

      return NextResponse.json({
        careers: careerRows.slice(0, 6),
        careersTotal: careersResp.total ?? careerRows.length,
        riasec,
        programSlugs,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Scoring failed';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  } catch (error) {
    console.error('/api/public/career-quiz/score:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
