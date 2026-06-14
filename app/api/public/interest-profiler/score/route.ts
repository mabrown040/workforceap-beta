import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isOnetConfigured } from '@/lib/onet/client';
import { getInterestProfilerCareers, getInterestProfilerResults } from '@/lib/onet/interestProfiler';
import { applyRiasecCareerFallback } from '@/lib/onet/interestProfilerCareerFallback';
import { riasecFromResultRows } from '@/lib/content/quizIpMerge';
import { mapIpCareerRowsToProgramSlugs } from '@/lib/onet/ipMapToPrograms';
import { checkPublicInterestProfilerRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';

const bodySchema = z.object({
  answers: z
    .string()
    .length(30)
    .regex(/^[1-5]{30}$/, 'Each answer must be a digit from 1 (strongly dislike) to 5 (strongly like).'),
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

    const { answers } = parsed.data;

    try {
      const results = await getInterestProfilerResults(answers);
      if (results.error) {
        return NextResponse.json({ error: String(results.error) }, { status: 422 });
      }
      const careersResp = await getInterestProfilerCareers(answers, { start: 1, end: 40 });
      const riasec = riasecFromResultRows(results.result ?? []);
      const careerRows = applyRiasecCareerFallback(careersResp.career ?? [], results.result ?? []);
      const programSlugs = await mapIpCareerRowsToProgramSlugs(
        careerRows.map((c) => ({ code: c.code, fit: c.fit }))
      );

      return NextResponse.json({
        result: results.result ?? [],
        careers: careerRows,
        careersTotal: careersResp.total ?? careerRows.length,
        riasec,
        programSlugs,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Scoring failed';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  } catch (error) {
    console.error('/api/public/interest-profiler/score:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
