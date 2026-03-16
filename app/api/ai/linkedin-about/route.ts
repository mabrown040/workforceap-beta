import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { linkedinAboutSchema } from '@/lib/validation/linkedinAbout';
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

  const parsed = linkedinAboutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
      { status: 400 }
    );
  }

  const { role, bullets } = parsed.data;

  const systemPrompt = `You are a LinkedIn profile expert. Write a polished 3-paragraph LinkedIn About section.

Guidelines:
- First paragraph: Hook with value proposition—who you are, what you do, and what makes you unique
- Second paragraph: Key experience, skills, and achievements (from the bullets provided)
- Third paragraph: What you're looking for or what drives you—forward-looking, personable
- Use first person ("I")
- Keep each paragraph 2-4 sentences
- Professional but approachable tone
- No fluff or clichés
- Total length: 200-400 words (LinkedIn limit is 2600 chars, so we have room)
- Output plain text, no headers or labels`;

  const userPrompt = `Target role: ${role}

Bullet points about the person:
---
${bullets}
---

Write a 3-paragraph LinkedIn About section.`;

  try {
    const output = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 800, temperature: 0.7 }
    );

    if (!output) return NextResponse.json({ error: 'No response from AI' }, { status: 500 });

    const summary = `${role} — ${bullets.slice(0, 50)}${bullets.length > 50 ? '...' : ''}`;
    try {
      await ensureUserInDb(user);
      await saveAIToolResult(user.id, 'linkedin_about', summary, output);
    } catch (saveErr) {
      console.error('LinkedIn about: failed to save result', saveErr);
    }

    return NextResponse.json({ output });
  } catch (err) {
    console.error('LinkedIn about error:', err);
    return NextResponse.json(
      { error: 'Failed to generate About section. Please try again.' },
      { status: 500 }
    );
  }
}
