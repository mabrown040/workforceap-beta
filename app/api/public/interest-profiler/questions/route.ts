import { NextRequest, NextResponse } from 'next/server';
import { isOnetConfigured } from '@/lib/onet/client';
import { fetchAllMiniIpQuestions } from '@/lib/onet/interestProfiler';
import { checkPublicInterestProfilerRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';

export async function GET(request: NextRequest) {
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

    try {
      const questions = await fetchAllMiniIpQuestions();
      if (questions.length === 0) {
        return NextResponse.json({ error: 'No questions returned from O*NET.' }, { status: 502 });
      }
      return NextResponse.json({ questions });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load questions';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  } catch (error) {
    console.error('/api/public/interest-profiler/questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
