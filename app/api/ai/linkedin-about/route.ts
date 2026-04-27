import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { linkedinAboutSchema } from '@/lib/validation/linkedinAbout';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { resolveActOnBehalf } from '@/lib/auth/actAsSubject';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';
import { resolveActOnBehalf } from '@/lib/auth/actAsSubject';

export async function POST(request: Request) {
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

  const parsed = linkedinAboutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
      { status: 400 }
    );
  }

  const { role, bullets, subjectMemberId, sessionId } = parsed.data;
  const onBehalf = await resolveActOnBehalf(user.id, subjectMemberId);
  if (!onBehalf.ok) return NextResponse.json({ error: onBehalf.error }, { status: onBehalf.status });

  let resumeContext = '';
  try {
    const text = await getMemberResumePlainText(onBehalf.subjectUserId, 4500);
    if (text.trim().length > 80) {
      resumeContext = text.trim();
    }
  } catch {
    /* optional context */
  }

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

  const userPrompt =
    `Target role: ${role}

Highlights / bullet points (member-provided):
---
${bullets}
---
` +
    (resumeContext
      ? `

Full resume text (from their WorkforceAP file — use for facts, roles, skills; do not invent experience not supported below):
---
${resumeContext}
---
`
      : '') +
    `
Write a 3-paragraph LinkedIn About section.`;

  try {
    const output = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 800, temperature: 0.7 }
    );

    if (!output) return NextResponse.json({ error: 'We could not generate a response. Please try again.' }, { status: 500 });

    const summary = `${role} — ${bullets.slice(0, 50)}${bullets.length > 50 ? '...' : ''}${resumeContext ? ' [+resume]' : ''}`;
    try {
      await ensureUserInDb(user);
      await saveAIToolResult(onBehalf.subjectUserId, 'linkedin_about', summary, output, {
        actorUserId: onBehalf.actorUserId,
        actorName: onBehalf.actorName,
        sessionId,
      });
    } catch (saveErr) {
      console.error('LinkedIn about: failed to save result', saveErr);
    }

    return NextResponse.json({ output });
  } catch (err) {
    console.error('LinkedIn about error:', err);
    return NextResponse.json(
      { error: 'We could not generate your About section just now. Please try again in a moment.' },
      { status: 500 }
    );
  }
}
