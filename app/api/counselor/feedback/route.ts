import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { awardPoints } from '@/lib/member/points';
import { chatCompletion } from '@/lib/ai/groq';
import { cleanSpokenLine } from '@/lib/ai/postProcess';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { getVoiceCoachTranscriptRecipients, sendVoiceCoachTranscriptEmail } from '@/lib/email';

interface FeedbackBody {
  transcript: { role: 'agent' | 'user'; text: string }[];
}

type TranscriptTurn = { role: 'agent' | 'user'; text: string };

const FALLBACK_STEPS = [
  'Update your resume with your most recent experience and skills',
  'Research 3 job listings that match your background and save them',
  'Reach out to one person in your network this week to let them know you are looking',
];

function normalizeTranscript(transcript: { role: 'agent' | 'user'; text: string }[]): TranscriptTurn[] {
  return transcript
    .map((turn): TranscriptTurn => ({
      role:
        (turn as { role?: string; speaker?: string }).role === 'agent' ||
        (turn as { role?: string; speaker?: string }).speaker === 'agent'
          ? 'agent'
          : 'user',
      text: typeof turn.text === 'string' ? turn.text.trim() : '',
    }))
    .filter((turn) => turn.text.length > 0);
}

function buildHistoryOutput(transcript: TranscriptTurn[], steps: string[]) {
  const lines: string[] = [];
  lines.push('Career readiness voice coach transcript');
  lines.push('');
  if (steps.length > 0) {
    lines.push('Action plan');
    lines.push('-----------');
    steps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step}`);
    });
    lines.push('');
  }
  lines.push('Transcript');
  lines.push('----------');
  transcript.forEach((turn) => {
    lines.push(`${turn.role === 'agent' ? 'Coach' : 'Member'}: ${turn.text}`);
  });
  return lines.join('\n').slice(0, 16000);
}

async function generateActionPlan(transcript: { role: 'agent' | 'user'; text: string }[]): Promise<string[]> {
  const conversation = transcript
    .map((t) => `${t.role === 'agent' ? 'Counselor' : 'Member'}: ${t.text}`)
    .join('\n');

  const systemPrompt = `You are a career counselor who just finished a voice session with a job seeker.
Based on the conversation, generate exactly 3 concrete, specific action steps the member can take TODAY or THIS WEEK.
Each step should be actionable and directly tied to what they shared.
Be warm, specific, and encouraging — not generic.
Respond with ONLY a JSON array of 3 strings. Example: ["Step one", "Step two", "Step three"]`;

  const userPrompt = `Here is the conversation transcript:\n\n${conversation}\n\nGenerate 3 specific next steps.`;

  // Try Anthropic first
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest',
        max_tokens: 400,
        temperature: 0.4,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (res.ok) {
      const payload = await res.json() as { content?: Array<{ type: string; text?: string }> };
      const text = payload.content?.find((c) => c.type === 'text')?.text?.trim();
      if (text) {
        try {
          const steps = JSON.parse(text) as string[];
          if (Array.isArray(steps) && steps.length > 0) {
            return steps.slice(0, 3).map((step) => cleanSpokenLine(step));
          }
        } catch { /* fall through */ }
      }
    }
  }

  // Groq fallback
  const result = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { maxTokens: 400, temperature: 0.4 }
  );

  if (result) {
    try {
      const steps = JSON.parse(result) as string[];
      if (Array.isArray(steps) && steps.length > 0) {
        return steps.slice(0, 3).map((step) => cleanSpokenLine(step));
      }
    } catch { /* fall through */ }
  }

  throw new Error('No AI provider configured');
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    let body: FeedbackBody;
    try {
      body = await req.json() as FeedbackBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  
    const transcript = normalizeTranscript(Array.isArray(body.transcript) ? body.transcript : []);
  
    if (transcript.length === 0) {
      return NextResponse.json({
        steps: FALLBACK_STEPS,
      });
    }
  
    try {
      let steps = FALLBACK_STEPS;
      try {
        const generatedSteps = await generateActionPlan(transcript);
        if (generatedSteps.length > 0) {
          steps = generatedSteps;
        }
      } catch (planErr) {
        console.error('Career counselor action-plan generation failed, using fallback steps:', planErr);
      }
  
      const output = buildHistoryOutput(transcript, steps);
  
      await ensureUserInDb(user);
      const resultId = await saveAIToolResult(
        user.id,
        'career_counselor',
        'Career readiness voice coach session',
        output
      );
  
      awardPoints(user.id, 'counselor_session', resultId).catch(() => {});
  
      try {
        const orgId = await getActorOrganizationId(user.id);
        const dbUser = await withTenantScope(orgId, (db) =>
          db.user.findFirst({
            where: { id: user.id },
            select: { fullName: true, email: true },
          }),
        );
  
        const recipients = getVoiceCoachTranscriptRecipients();
        if (recipients.length > 0) {
          await sendVoiceCoachTranscriptEmail({
            to: recipients,
            memberName: dbUser?.fullName?.trim() || user.email || 'WorkforceAP member',
            memberEmail: dbUser?.email?.trim() || user.email || null,
            coachLabel: 'Career Readiness Coach',
            transcriptTurns: transcript,
            highlights: steps,
          });
        }
      } catch (emailErr) {
        console.error('Career counselor transcript email error:', emailErr);
      }
  
      return NextResponse.json({ steps });
    } catch (err) {
      console.error('Career counselor feedback persistence error:', err);
      return NextResponse.json({ error: 'Failed to save transcript' }, { status: 500 });
    }
  } catch (error) {
    console.error('/counselor/feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
