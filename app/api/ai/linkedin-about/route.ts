import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit, checkAICoachUserRateLimit, checkAICoachIpRateLimit } from '@/lib/rate-limit';
import { linkedinAboutSchema } from '@/lib/validation/linkedinAbout';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { resolveActOnBehalf } from '@/lib/auth/actAsSubject';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';
import { cleanLongFormPlainText } from '@/lib/ai/postProcess';

import { prefillLinkedInAbout } from '@/lib/ai/prefillFromMemberState';
import { getAICoachContext, renderCoachContextForPrompt } from '@/lib/ai/aiCoachContext';
import { getClientIp } from '@/lib/api-utils';
import { createApiErrorResponse, createRateLimitResponse, createServiceUnavailableResponse, createUnauthorizedResponse } from '@/lib/api-utils';
import { withApiGuc } from '@/lib/db/withRequestGuc';export const POST = withApiGuc(async (request: Request) => {
  try {
    const user = await getUser();
    if (!user) return createUnauthorizedResponse();
    if (!isAIConfigured()) return createServiceUnavailableResponse();
  
    const { success } = await checkAIToolRateLimit(user.id);
    const ip = getClientIp(request);
    const userLimit = await checkAICoachUserRateLimit(user.id);
    const ipLimit = await checkAICoachIpRateLimit(ip);
    if (!userLimit.success || !ipLimit.success) return createRateLimitResponse();
    if (!success) return createRateLimitResponse();
  
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createApiErrorResponse('Invalid JSON', 'VALIDATION_ERROR', 400);
    }
  
    const parsed = linkedinAboutSchema.safeParse(body);
    if (!parsed.success) {
      return createApiErrorResponse(parsed.error.errors[0]?.message ?? 'Validation failed', 'VALIDATION_ERROR', 400);
    }
  
    const { role, bullets, subjectMemberId, sessionId, prefill: shouldPrefill, parentToolResultId } = parsed.data;
    const onBehalf = await resolveActOnBehalf(user.id, subjectMemberId);
    if (!onBehalf.ok) return NextResponse.json({ error: onBehalf.error }, { status: onBehalf.status });
  
    let finalRole = role?.trim();
    let finalBullets = bullets?.trim();
  
    // If no role/bullets provided, try to prefill from member state
    if (!finalRole || !finalBullets) {
      if (shouldPrefill) {
        const prefill = await prefillLinkedInAbout(onBehalf.subjectUserId);
        if (!finalRole) finalRole = prefill.targetRole;
        if (!finalBullets) finalBullets = prefill.resume;
      }
    }
  
    let resumeContext = '';
    try {
      const text = await getMemberResumePlainText(onBehalf.subjectUserId, 4500);
      if (text.trim().length > 80) {
        resumeContext = text.trim();
      }
    } catch {
      /* optional context */
    }
  
    // Sprint R2 — coach context block.
    let coachContextBlock = '';
    try {
      const ctx = await getAICoachContext(onBehalf.subjectUserId);
      coachContextBlock = `\n\n${renderCoachContextForPrompt(ctx)}`;
    } catch (ctxErr) {
      console.error('[linkedin-about] coach context load failed', ctxErr);
    }
    if (parentToolResultId) {
      coachContextBlock += `\n- The member asked to regenerate with a different angle from a prior About section — vary opening hook and emphasis.`;
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
  - Output plain text, no headers or labels${coachContextBlock}`;
  
    const userPrompt =
      `Target role: ${finalRole || 'Not specified'}
  
  Highlights / bullet points (member-provided):
  ---
  ${finalBullets || 'Not specified'}
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
  
      const summary = `${finalRole || 'LinkedIn About'} — ${(finalBullets || '').slice(0, 50)}${(finalBullets || '').length > 50 ? '...' : ''}${resumeContext ? ' [+resume]' : ''}`;
      try {
        await ensureUserInDb(user);
        await saveAIToolResult(onBehalf.subjectUserId, 'linkedin_about', summary, output, {
          actorUserId: onBehalf.actorUserId,
          actorName: onBehalf.actorName,
          sessionId,
          parentToolResultId: parentToolResultId ?? null,
        });
      } catch (saveErr) {
        console.error('LinkedIn about: failed to save result', saveErr);
      }
  
      return NextResponse.json({ output: cleanLongFormPlainText(output) });
    } catch (err) {
      console.error('LinkedIn about error:', err);
      return NextResponse.json(
        { error: 'We could not generate your About section just now. Please try again in a moment.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('/ai/linkedin-about:', error);
    return createApiErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
});
