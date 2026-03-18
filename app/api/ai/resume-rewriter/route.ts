import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { resumeRewriterSchema } from '@/lib/validation/resumeRewriter';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { saveAIToolResult } from '@/lib/ai/saveResult';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAIConfigured()) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
  }

  const { success } = await checkAIToolRateLimit(user.id);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again in an hour.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = resumeRewriterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
      { status: 400 }
    );
  }

  const { resume, jobTarget, targetSalary, targetLocation } = parsed.data;

  // Build context string for salary/location signals
  const goalContext = [
    targetSalary ? `Target salary range: ${targetSalary}` : null,
    targetLocation ? `Target location/market: ${targetLocation}` : null,
  ].filter(Boolean).join('\n');

  const systemPrompt = `You are a career positioning coach and professional resume writer. Your job is to help job seekers frame and position their existing experience toward a specific goal — without inventing, fabricating, or exaggerating anything.

CORE PRINCIPLE: You are a FRAMING tool, not a fabrication tool. Every accomplishment, role, and skill in the output must be traceable to something in their original resume. Do not add jobs, degrees, certifications, or achievements that are not in the original.

What you CAN do:
- Reframe existing experience using stronger, more targeted language
- Surface and highlight transferable skills that the person may have understated
- Add quantifiable context where it can be reasonably inferred (e.g. "managed team projects" → "led cross-functional project coordination")
- Use keywords and phrasing that align with the target role and salary level
- Adjust tone and seniority of language to match the target salary bracket
- Reference the local job market context if a location is provided

Salary calibration:
- $40K-$60K: Focus on foundational skills, entry-level readiness, willingness to learn
- $60K-$80K: Emphasize reliability, demonstrated skills, team contributions
- $80K-$100K: Highlight ownership, impact, technical depth, process improvement
- $100K-$130K: Lead with leadership, cross-functional influence, measurable outcomes
- $130K+: Frame around strategic impact, organizational value, domain authority

Format your response in two parts:
1. REPOSITIONED RESUME: The full resume, repositioned toward their goal. Use clear section headers.
2. HOW WE POSITIONED YOU: 3-5 bullet points explaining what was reframed and why — helping the member understand the strategy, not just copy the output.`;

  const userPrompt = `CAREER GOAL
Target role: ${jobTarget}${goalContext ? `\n${goalContext}` : ''}

ORIGINAL RESUME
---
${resume}
---

Reposition this resume toward the career goal above. Remember: only work with what is actually in the resume. Frame it powerfully toward the target — do not invent anything.`;

  try {
    const output = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 4000, temperature: 0.7 }
    );

    if (!output) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    try {
      await ensureUserInDb(user);
      const contextLabel = [jobTarget, targetLocation, targetSalary].filter(Boolean).join(' | ');
      await saveAIToolResult(user.id, 'resume_rewriter', contextLabel, output);
    } catch (saveErr) {
      console.error('Resume rewriter: failed to save result', saveErr);
    }

    return NextResponse.json({ output });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Resume rewriter error:', err);
    if (message.includes('rate') || message.includes('429')) {
      return NextResponse.json({ error: 'AI service is busy. Please try again in a minute.' }, { status: 429 });
    }
    if (message.includes('401') || message.includes('invalid') || message.includes('api_key')) {
      return NextResponse.json({ error: 'AI service configuration error. Please contact support.' }, { status: 503 });
    }
    return NextResponse.json(
      { error: 'Failed to process your resume. Please try again.' },
      { status: 500 }
    );
  }
}