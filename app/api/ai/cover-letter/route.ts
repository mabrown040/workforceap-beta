import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { coverLetterSchema } from '@/lib/validation/coverLetter';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { saveAIToolResult } from '@/lib/ai/saveResult';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAIConfigured()) return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });

  const { success } = await checkAIToolRateLimit(user.id);
  if (!success) return NextResponse.json({ error: 'Rate limit exceeded. Try again in an hour.' }, { status: 429 });

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

  const { resume, jobDescription, companyName } = parsed.data;

  const systemPrompt = `You are a professional cover letter writer. Create a compelling, tailored cover letter that connects the candidate's experience to the job requirements. Use a professional tone. Format as plain text with a greeting, 2-3 body paragraphs, and a closing. Do not invent experience—only use what the candidate provided.`;

  const userPrompt = `Company: ${companyName}

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

    if (!output) return NextResponse.json({ error: 'No response from AI' }, { status: 500 });

    const summary = `${companyName} — ${jobDescription.slice(0, 60)}${jobDescription.length > 60 ? '...' : ''}`;
    try {
      await saveAIToolResult(user.id, 'cover_letter', summary, output);
    } catch (saveErr) {
      console.error('Cover letter: failed to save result', saveErr);
    }

    return NextResponse.json({ output });
  } catch (err) {
    console.error('Cover letter error:', err);
    return NextResponse.json(
      { error: 'Failed to generate cover letter. Please try again.' },
      { status: 500 }
    );
  }
}
