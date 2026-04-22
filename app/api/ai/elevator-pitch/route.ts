import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { prisma } from '@/lib/db/prisma';
import { sendElevatorSpeechEmail } from '@/lib/email';

/**
 * POST /api/ai/elevator-pitch
 * Body: { name, targetRole, strengths, certifications, industry }
 * Returns: { pitch: string, emailSent?: boolean } — a 10-20 second elevator statement
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isAIConfigured()) {
    return NextResponse.json({ error: 'This feature is temporarily unavailable. Please try again soon.' }, { status: 503 });
  }

  const { success } = await checkAIToolRateLimit(user.id);
  if (!success) return NextResponse.json({ error: 'Rate limit exceeded. Please try again in a few minutes.' }, { status: 429 });

  let body: Record<string, string>;
  try { body = await request.json() as Record<string, string>; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { name, targetRole, strengths, certifications, industry } = body;

  if (!name?.trim() || !targetRole?.trim()) {
    return NextResponse.json({ error: 'Name and target role are required.' }, { status: 400 });
  }

  const prompt = `Write a powerful, natural-sounding 10-20 second elevator pitch (spoken out loud) for someone with these details:

Name: ${name.trim()}
Target position / job title: ${targetRole.trim()}
Key strengths / what they excel at: ${strengths?.trim() || 'not specified'}
Certifications / credentials: ${certifications?.trim() || 'not specified'}
Target industry: ${industry?.trim() || 'not specified'}

Requirements:
- Conversational, confident tone — sounds like a real person, not a resume
- Includes who they are, what they do best, and what they're looking for
- Ends with a clear connection hook (e.g. "I'd love to bring this to [industry]")
- Exactly 40-60 words when spoken at a natural pace
- First person ("I am…", "I excel at…")
- No corporate buzzwords or clichés

Return ONLY the pitch text — no labels, no quotes, no explanation.`;

  try {
    const pitch = await chatCompletion(
      [
        { role: 'system', content: 'You write concise, natural elevator pitches for job seekers. Return only the pitch, nothing else.' },
        { role: 'user', content: prompt },
      ],
      { maxTokens: 200, temperature: 0.7 }
    );

    if (!pitch) return NextResponse.json({ error: 'Could not generate pitch. Try again.' }, { status: 500 });

    try {
      await ensureUserInDb(user);
      await saveAIToolResult(
        user.id,
        'career_counselor',
        `AI elevator speech for ${targetRole.trim()}`,
        JSON.stringify({ type: 'elevator_pitch', name: name.trim(), targetRole: targetRole.trim(), strengths, certifications, industry, pitch })
      );
    } catch (persistError) {
      console.error('[elevator-pitch] failed to persist result', persistError);
    }

    let emailSent = false;
    let emailError: string | undefined;

    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { fullName: true, email: true },
      });

      const recipient = dbUser?.email?.trim() || user.email || '';
      if (recipient) {
        const emailResult = await sendElevatorSpeechEmail({
          to: recipient,
          memberName: dbUser?.fullName?.trim() || name.trim() || recipient,
          targetRole: targetRole.trim(),
          strengths: strengths?.trim() || null,
          certifications: certifications?.trim() || null,
          industry: industry?.trim() || null,
          pitch: pitch.trim(),
        });
        emailSent = emailResult.ok;
        emailError = emailResult.error;
      } else {
        emailError = 'No email address found for this member';
      }
    } catch (emailErr) {
      console.error('[elevator-pitch] failed to email result', emailErr);
      emailError = emailErr instanceof Error ? emailErr.message : 'Failed to send email';
    }

    return NextResponse.json({ pitch: pitch.trim(), emailSent, emailError });
  } catch (e) {
    console.error('[elevator-pitch] generation failed', e);
    return NextResponse.json({ error: 'Failed to generate pitch' }, { status: 500 });
  }
}
