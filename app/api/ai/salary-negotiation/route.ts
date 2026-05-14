import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { salaryNegotiationSchema } from '@/lib/validation/salaryNegotiation';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { resolveActOnBehalf } from '@/lib/auth/actAsSubject';
import { cleanLongFormPlainText } from '@/lib/ai/postProcess';

export async function POST(request: Request) {
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
  
    const parsed = salaryNegotiationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
        { status: 400 }
      );
    }
  
    const { currentOffer, targetSalary, jobTitle, companyName, deliveryMethod, subjectMemberId, sessionId } = parsed.data;
    const onBehalf = await resolveActOnBehalf(user.id, subjectMemberId);
    if (!onBehalf.ok) return NextResponse.json({ error: onBehalf.error }, { status: onBehalf.status });
    const isPhone = deliveryMethod === 'phone';
  
    const systemPrompt = `You are a salary negotiation coach. Create a word-for-word script for a candidate to use when negotiating.
  
  The script must be tailored to the delivery method:
  - PHONE: Conversational, natural pacing. Include when to pause, when to wait for response. Short phrases they can say one at a time. Include a brief opener and closer.
  - EMAIL: Professional, structured. Clear subject line suggestion. Opening greeting, body paragraphs, closing. Ready to copy-paste.
  
  Format: Plain text, easy to follow. Include [PAUSE] or [WAIT FOR RESPONSE] for phone. For email, include a suggested subject line.`;
  
    const userPrompt = `Current offer: $${currentOffer.toLocaleString()}
  Target salary: $${targetSalary.toLocaleString()}
  Job title: ${jobTitle}
  Company: ${companyName}
  Delivery: ${isPhone ? 'Phone call' : 'Email'}
  
  Write a ${isPhone ? 'phone call' : 'email'} script they can use word-for-word.`;
  
    try {
      const output = await chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { maxTokens: 1000, temperature: 0.6 }
      );
  
      if (!output) return NextResponse.json({ error: 'We could not generate a response. Please try again.' }, { status: 500 });
  
      const summary = `${companyName} — ${jobTitle} — $${currentOffer} → $${targetSalary}`;
      try {
        await ensureUserInDb(user);
        await saveAIToolResult(onBehalf.subjectUserId, 'salary_negotiation', summary, output, {
          actorUserId: onBehalf.actorUserId,
          actorName: onBehalf.actorName,
          sessionId,
        });
      } catch (saveErr) {
        console.error('Salary negotiation: failed to save result', saveErr);
      }
  
      return NextResponse.json({ output: cleanLongFormPlainText(output) });
    } catch (err) {
      console.error('Salary negotiation error:', err);
      return NextResponse.json(
        { error: 'We could not generate your script just now. Please try again in a moment.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('/ai/salary-negotiation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
