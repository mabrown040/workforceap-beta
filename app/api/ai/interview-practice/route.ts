import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { interviewPracticeSchema } from '@/lib/validation/interviewPractice';
import { chatCompletion } from '@/lib/ai/groq';
import { ifAiUnconfigured } from '@/lib/ai/aiUnavailableResponse';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { prefillInterviewPractice } from '@/lib/ai/prefillFromMemberState';
import { getAICoachContext, renderCoachContextForPrompt } from '@/lib/ai/aiCoachContext';
import { aiResponseLanguageInstruction } from '@/lib/ai/responseLanguage';
import { resolveActOnBehalf } from '@/lib/auth/actAsSubject';
import { cleanLongFormPlainText, cleanSpokenLine } from '@/lib/ai/postProcess';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const LEVEL_PROMPTS = {
  entry: 'entry-level / junior (0-2 years experience)',
  mid: 'mid-level (3-7 years experience)',
  senior: 'senior / lead (8+ years experience)',
};export const POST = withApiGuc(async (request: Request) => {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    const unconfigured = ifAiUnconfigured();
    if (unconfigured) return unconfigured;
  
    const { success } = await checkAIToolRateLimit(user.id);
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again in a few minutes.' }, { status: 429 });
    }
  
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  
    const parsed = interviewPracticeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
        { status: 400 }
      );
    }
  
    const { role, experienceLevel, count, resumeContext, language, subjectMemberId, sessionId, parentToolResultId } = parsed.data;
  
    // Resolve subject FIRST so we know who to prefill for
    const onBehalf = await resolveActOnBehalf(user.id, subjectMemberId);
    if (!onBehalf.ok) {
      return NextResponse.json({ error: onBehalf.error }, { status: onBehalf.status });
    }
  
    let finalRole = role?.trim();
    let finalExperienceLevel = experienceLevel;
    let finalResumeContext = resumeContext?.trim();
  
    // If role missing, try to prefill from member state
    if (!finalRole || finalRole.length < 3) {
      try {
        const prefill = await prefillInterviewPractice(onBehalf.subjectUserId);
        finalRole = prefill.role;
        if (!finalExperienceLevel || finalExperienceLevel === 'mid') {
          finalExperienceLevel = prefill.experienceLevel;
        }
        if (!finalResumeContext || finalResumeContext.length < 40) {
          finalResumeContext = prefill.resumeContext;
        }
      } catch (prefillErr) {
        console.error('[interview-practice] prefill failed', prefillErr);
      }
    }
  
    if (!finalRole || finalRole.length < 3) {
      return NextResponse.json(
        { error: 'Role is required. Try uploading a resume or completing the career quiz so we can suggest a role for you.' },
        { status: 400 }
      );
    }
  
    const levelDesc = LEVEL_PROMPTS[finalExperienceLevel];

    // Sprint R2 — load AI coach context so the question set adapts to what
    // the candidate has already worked on with us.
    let coachContextBlock = '';
    try {
      const ctx = await getAICoachContext(onBehalf.subjectUserId);
      coachContextBlock = `\n\n${renderCoachContextForPrompt(ctx)}`;
    } catch (ctxErr) {
      console.error('[interview-practice] coach context load failed', ctxErr);
    }
    if (parentToolResultId) {
      coachContextBlock += `\n- The member asked to regenerate with a different angle from prior practice — avoid repeating the same questions verbatim.`;
    }

    const systemPrompt = `You are a career coach and interview preparation expert. Generate interview questions for job seekers.
  ${coachContextBlock}

  ${aiResponseLanguageInstruction(language)}
  
  Format your response as a JSON array of objects. Each object must have:
  - "question": the interview question (string)
  - "type": "behavioral" or "technical" (string)
  - "tip": brief answer tip or framework (string, 1-2 sentences)
  - "starHint": optional hint for STAR method if behavioral (string)
  - "exampleAnswer": a 2-3 sentence example answer showing how to respond. For behavioral questions, use STAR (Situation, Task, Action, Result). For technical questions, show a concise, structured response. This helps members see what a strong answer looks like.
  
  Return ONLY the JSON array, no other text. Keep JSON property names exactly as specified in English, but write every member-facing string value in the requested response language.`;
  
    const resumeBlock =
      finalResumeContext?.trim() &&
      `\n\nCandidate resume / background (use only to tailor questions and examples; do not invent employers or titles not supported here):\n---\n${finalResumeContext.trim()}\n---`;
  
    const userPrompt = `Generate ${count} interview questions for a ${finalRole} role at ${levelDesc} level.
  
  Include a mix of behavioral (STAR method) and technical questions. Make them specific to this role. For each question, provide an exampleAnswer that demonstrates a strong 2-3 sentence response.${resumeBlock ?? ''}`;
  
    try {
      const raw = await chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { maxTokens: 2500, temperature: 0.8 }
      );
      if (!raw) {
        return NextResponse.json({ error: 'We could not generate a response. Please try again.' }, { status: 500 });
      }
  
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = raw;
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) jsonStr = match[0];
  
      const questions = JSON.parse(jsonStr) as Array<{ question: string; type: string; tip: string; starHint?: string; exampleAnswer?: string }>;
      if (!Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
      }
  
      const output = JSON.stringify(questions);
      const summary = `${finalRole} (${finalExperienceLevel})`;
      try {
        await ensureUserInDb(user);
        await saveAIToolResult(
          onBehalf.subjectUserId,
          'interview_practice',
          summary,
          output,
          {
            actorUserId: onBehalf.actorUserId,
            actorName: onBehalf.actorName,
            sessionId: sessionId ?? null,
            parentToolResultId: parentToolResultId ?? null,
          }
        );
      } catch (saveErr) {
        console.error('Interview practice: failed to save result', saveErr);
      }
  
      const cleanedQuestions = questions.map((q) => ({
        ...q,
        question: cleanSpokenLine(q.question),
        tip: cleanLongFormPlainText(q.tip),
        starHint: q.starHint ? cleanLongFormPlainText(q.starHint) : q.starHint,
        exampleAnswer: q.exampleAnswer ? cleanLongFormPlainText(q.exampleAnswer) : q.exampleAnswer,
      }));
      return NextResponse.json({ questions: cleanedQuestions });
    } catch (err) {
      console.error('Interview practice error:', err);
      return NextResponse.json(
        { error: 'We could not generate practice questions just now. Please try again in a moment.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('/ai/interview-practice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
