import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { resumeStrengthSchema } from '@/lib/validation/resumeStrength';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { resolveActOnBehalf } from '@/lib/auth/actAsSubject';
import { cleanLongFormPlainText } from '@/lib/ai/postProcess';

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
  
    const parsed = resumeStrengthSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
        { status: 400 }
      );
    }
  
    const { resume, subjectMemberId, sessionId } = parsed.data;
    const onBehalf = await resolveActOnBehalf(user.id, subjectMemberId);
    if (!onBehalf.ok) return NextResponse.json({ error: onBehalf.error }, { status: onBehalf.status });
  
    const systemPrompt = `You are an ATS-savvy career coach. Analyze the candidate's resume on its own (no job description).
  
  Your response MUST follow this exact format:
  
  OVERALL SCORE: [number]%
  (0–100 for overall resume strength: clarity, impact, keywords, structure, and scannability. Be realistic.)
  
  STRENGTHS:
  • [2–4 specific bullets — what is working well]
  
  PRIORITY IMPROVEMENTS:
  • [3–6 bullets — concrete fixes: metrics, stronger verbs, section order, gaps, formatting]
  
  QUICK WINS:
  • [2–3 bullets — easiest changes with high impact]
  
  Keep it concise and actionable. No fluff.`;
  
    const userPrompt = `Resume to analyze:\n---\n${resume}\n---\n\nAnalyze and output in the format above.`;
  
    try {
      const output = await chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { maxTokens: 1400, temperature: 0.45 }
      );
  
      if (!output) return NextResponse.json({ error: 'We could not generate a response. Please try again.' }, { status: 500 });
  
      try {
        await ensureUserInDb(user);
        await saveAIToolResult(onBehalf.subjectUserId, 'resume_analysis', 'Resume strength', output, {
          actorUserId: onBehalf.actorUserId,
          actorName: onBehalf.actorName,
          sessionId,
        });
      } catch (saveErr) {
        console.error('Resume strength: failed to save result', saveErr);
      }
  
      return NextResponse.json({ output: cleanLongFormPlainText(output) });
    } catch (err) {
      console.error('Resume strength error:', err);
      return NextResponse.json({ error: 'We could not analyze your resume just now. Please try again in a moment.' }, { status: 500 });
    }
  } catch (error) {
    console.error('/ai/resume-strength:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
