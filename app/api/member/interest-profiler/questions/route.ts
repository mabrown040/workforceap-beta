import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isOnetConfigured } from '@/lib/onet/client';
import { fetchAllMiniIpQuestions } from '@/lib/onet/interestProfiler';
import { withApiGuc } from '@/lib/db/withRequestGuc';

async function _GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    console.error('/member/interest-profiler/questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);
