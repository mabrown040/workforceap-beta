import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { linkedinHeadlineSchema } from '@/lib/validation/linkedinHeadline';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { resolveActOnBehalf } from '@/lib/auth/actAsSubject';
import { cleanSpokenLine } from '@/lib/ai/postProcess';

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
  
    const parsed = linkedinHeadlineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
        { status: 400 }
      );
    }
  
    const { role, keySkills, yearsExperience, subjectMemberId, sessionId } = parsed.data;
    const onBehalf = await resolveActOnBehalf(user.id, subjectMemberId);
    if (!onBehalf.ok) return NextResponse.json({ error: onBehalf.error }, { status: onBehalf.status });
  
    const systemPrompt = `You are a LinkedIn profile expert. Generate 3 compelling LinkedIn headline options. Each must be under 120 characters. Include the target role and key value props. Format as a JSON array of strings: ["headline1", "headline2", "headline3"]. Return ONLY the JSON array.`;
  
    const userPrompt = `Role: ${role}
  Key skills: ${keySkills}
  ${yearsExperience ? `Experience: ${yearsExperience}` : ''}
  
  Generate 3 LinkedIn headline options.`;
  
    try {
      const raw = await chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { maxTokens: 500, temperature: 0.8 }
      );
  
      if (!raw) return NextResponse.json({ error: 'We could not generate a response. Please try again.' }, { status: 500 });
  
      const match = raw.match(/\[[\s\S]*?\]/);
      const jsonStr = match ? match[0] : raw;
      const headlines = JSON.parse(jsonStr) as string[];
  
      if (!Array.isArray(headlines) || headlines.length === 0) {
        return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
      }
  
      const output = JSON.stringify(headlines.slice(0, 5));
      const summary = `${role} — ${keySkills.slice(0, 40)}${keySkills.length > 40 ? '...' : ''}`;
      try {
        await ensureUserInDb(user);
        await saveAIToolResult(onBehalf.subjectUserId, 'linkedin_headline', summary, output, {
          actorUserId: onBehalf.actorUserId,
          actorName: onBehalf.actorName,
          sessionId,
        });
      } catch (saveErr) {
        console.error('LinkedIn headline: failed to save result', saveErr);
      }
  
      return NextResponse.json({ headlines: headlines.slice(0, 5).map(cleanSpokenLine) });
    } catch (err) {
      console.error('LinkedIn headline error:', err);
      return NextResponse.json(
        { error: 'We could not generate headlines just now. Please try again in a moment.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('/ai/linkedin-headline:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
