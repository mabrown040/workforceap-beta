import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { coverLetterSchema } from '@/lib/validation/coverLetter';
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
  
    const parsed = coverLetterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
        { status: 400 }
      );
    }
  
    const { resume, jobDescription, companyName, tone, subjectMemberId, sessionId } = parsed.data;
  
    // Resolve subject (counselor/admin In-Office Session — see actAsSubject).
    const onBehalf = await resolveActOnBehalf(user.id, subjectMemberId);
    if (!onBehalf.ok) {
      return NextResponse.json({ error: onBehalf.error }, { status: onBehalf.status });
    }
  
    const toneInstructions: Record<string, string> = {
      formal: 'Use a formal, traditional tone. Professional and polished. Standard business language.',
      confident: 'Use a confident, assertive tone. Highlight achievements boldly. Show you know your value.',
      conversational: 'Use a warm, conversational tone. Approachable but still professional. Slightly more personal.',
    };
    const toneInstruction = toneInstructions[tone] ?? toneInstructions.formal;
  
    const systemPrompt = `You are a professional cover letter writer. Create a compelling, tailored cover letter that connects the candidate's experience to the job requirements. ${toneInstruction} Format as plain text with a greeting, 2-3 body paragraphs, and a closing. Do not invent experience—only use what the candidate provided.`;
  
    const userPrompt = `Company: ${companyName}
  Tone: ${tone}
  
  Job description:
  ---
  ${jobDescription}
  ---
  
  Candidate's resume/experience:
  ---
  ${resume}
  ---
  
  Write a tailored cover letter.`;
  
    try {
      const output = await chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { maxTokens: 1500, temperature: 0.7 }
      );
  
      if (!output) return NextResponse.json({ error: 'We could not generate a response. Please try again.' }, { status: 500 });
  
      const summary = `${companyName} — ${jobDescription.slice(0, 60)}${jobDescription.length > 60 ? '...' : ''}`;
      try {
        await ensureUserInDb(user);
        await saveAIToolResult(
          onBehalf.subjectUserId,
          'cover_letter',
          summary,
          output,
          {
            actorUserId: onBehalf.actorUserId,
            actorName: onBehalf.actorName,
            sessionId: sessionId ?? null,
          }
        );
      } catch (saveErr) {
        console.error('Cover letter: failed to save result', saveErr);
      }
  
      return NextResponse.json({ output: cleanLongFormPlainText(output) });
    } catch (err) {
      console.error('Cover letter error:', err);
      return NextResponse.json(
        { error: 'We could not generate your cover letter just now. Please try again in a moment.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('/ai/cover-letter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
