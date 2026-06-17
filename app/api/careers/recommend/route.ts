import { NextRequest, NextResponse } from 'next/server';
import { checkCareersRecommendRateLimit } from '@/lib/rate-limit';
import { buildCareerMatchResult } from '@/lib/onet/recommend';
import { quizAnswersSchema } from '@/lib/onet/quizSchema';
import { withApiGuc } from '@/lib/db/withRequestGuc';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

async function _POST(request: NextRequest) {
  try {
  const ip = getClientIp(request);
  const { success: rateOk } = await checkCareersRecommendRateLimit(ip);
  if (!rateOk) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = quizAnswersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid quiz answers' }, { status: 400 });
  }

  const { ipRiasec, ...answers } = parsed.data;
  const result = await buildCareerMatchResult(answers, { ipRiasec: ipRiasec ?? null });
  return NextResponse.json(result);

  } catch (error) {
    console.error('/careers/recommend error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiGuc(_POST);
