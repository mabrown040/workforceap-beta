import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { parseResumeCoachSuggestionsFromTranscript } from '@/lib/ai/parseResumeCoachSuggestions';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const turnSchema = z.object({
  speaker: z.enum(['agent', 'user']).optional(),
  text: z.string().max(2000).optional(),
});

const bodySchema = z.object({
  transcript: z.array(turnSchema).max(100).default([]),
});

/**
 * POST — parse the in-progress voice transcript into live resume suggestions.
 * Input: { transcript: Array<{ speaker: 'agent' | 'user'; text: string }> }
 * Output: { suggestions: Array<{ original?: string; suggested: string; context: string }> }
 */
async function _POST(req: NextRequest) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { success: withinLimit } = await checkAIToolRateLimit(user.id);
  if (!withinLimit) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait before trying again.' }, { status: 429 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const suggestions = await parseResumeCoachSuggestionsFromTranscript(parsed.data.transcript, {
    maxSuggestions: 6,
    maxAgentChars: 4000,
  });

  return NextResponse.json({ suggestions });

  } catch (error) {
    console.error('/member/resume-coach/live-suggestions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
