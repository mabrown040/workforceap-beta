import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { gapAnalyzerSchema } from '@/lib/validation/gapAnalyzer';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { resolveActOnBehalf } from '@/lib/auth/actAsSubject';
import { cleanLongFormPlainText } from '@/lib/ai/postProcess';

import { prefillGapAnalyzer, honestNoResumeError } from '@/lib/ai/prefillFromMemberState';
import { loadCoachContextBlock } from '@/lib/ai/coachContextBlock';
import { withApiGuc } from '@/lib/db/withRequestGuc';export const POST = withApiGuc(async (request: Request) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAIConfigured()) return NextResponse.json({ error: 'This feature is temporarily unavailable. Please try again soon.' }, { status: 503 });
  
    const { success } = await checkAIToolRateLimit(user.id);
    if (!success) return NextResponse.json({ error: 'Rate limit exceeded. Please try again in a few minutes.' }, { status: 429 });
  
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  
    const parsed = gapAnalyzerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
        { status: 400 }
      );
    }
  
    const { resume, subjectMemberId, sessionId, prefill: shouldPrefill } = parsed.data;
    const onBehalf = await resolveActOnBehalf(user.id, subjectMemberId);
    if (!onBehalf.ok) return NextResponse.json({ error: onBehalf.error }, { status: onBehalf.status });
  
    let finalResume = resume?.trim();
  
    // If no resume provided, try to prefill from member state
    if (!finalResume || finalResume.length < 40) {
      if (shouldPrefill) {
        const prefill = await prefillGapAnalyzer(onBehalf.subjectUserId);
        if (!prefill.resume || prefill.resume.length < 40) {
          const err = honestNoResumeError();
          return NextResponse.json({ error: err.error }, { status: err.status });
        }
        finalResume = prefill.resume;
      }
    }
  
    const systemPrompt = `You are a career coach specializing in resume gaps. Analyze a resume for employment gaps and provide actionable framing.
  
  For each gap you detect:
  1. GAP: [Date range] — [Brief description, e.g. "18 months between roles"]
  2. SUGGESTED FRAMING: [1-2 sentences they can use in cover letter or interview]
  - Cover letter: How to address it professionally
  - Interview: Talking point that acknowledges without apologizing
  
  Be supportive, not judgmental. Gaps are common—caregiving, education, health, job search. Focus on what they DID during the gap if possible (e.g. freelance, certifications, volunteer). If no info, suggest neutral framing.
  
  Format your response as:
  ---
  GAP 1: [date range]
  Framing: [cover letter language]
  Interview talking point: [what to say]
  
  GAP 2: ...
  ---
  
  If no significant gaps are found, say: "No significant employment gaps detected. Your work history appears continuous."${await loadCoachContextBlock(onBehalf.subjectUserId)}`;

    const userPrompt = `Resume:
  ---
  ${finalResume ?? resume}
  ---
  
  Identify any employment gaps and provide framing language for each.`;
  
    try {
      const output = await chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { maxTokens: 1500, temperature: 0.5 }
      );
  
      if (!output) return NextResponse.json({ error: 'We could not generate a response. Please try again.' }, { status: 500 });
  
      const summary = finalResume?.slice(0, 80) + ((finalResume?.length ?? 0) > 80 ? '...' : '');
      try {
        await ensureUserInDb(user);
        await saveAIToolResult(onBehalf.subjectUserId, 'gap_analyzer', summary, output, {
          actorUserId: onBehalf.actorUserId,
          actorName: onBehalf.actorName,
          sessionId,
        });
      } catch (saveErr) {
        console.error('Gap analyzer: failed to save result', saveErr);
      }
  
      return NextResponse.json({ output: cleanLongFormPlainText(output) });
    } catch (err) {
      console.error('Gap analyzer error:', err);
      return NextResponse.json(
        { error: 'We could not analyze the skill gaps just now. Please try again in a moment.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('/ai/gap-analyzer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
