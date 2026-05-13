import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { parseResumeCoachSuggestionsFromTranscript } from '@/lib/ai/parseResumeCoachSuggestions';

/**
 * POST — parse the in-progress voice transcript into live resume suggestions.
 * Input: { transcript: Array<{ speaker: 'agent' | 'user'; text: string }> }
 * Output: { suggestions: Array<{ original?: string; suggested: string; context: string }> }
 */
export async function POST(req: NextRequest) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { transcript } = (await req.json()) as {
    transcript?: Array<{ speaker?: string; text?: string }>;
  };

  const suggestions = await parseResumeCoachSuggestionsFromTranscript(transcript ?? [], {
    maxSuggestions: 6,
    maxAgentChars: 4000,
  });

  return NextResponse.json({ suggestions });

  } catch (error) {
    console.error('/member/resume-coach/live-suggestions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

