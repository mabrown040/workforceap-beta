import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit, checkAICoachUserRateLimit, checkAICoachIpRateLimit } from '@/lib/rate-limit';
import { salaryNegotiationSchema } from '@/lib/validation/salaryNegotiation';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { resolveActOnBehalf } from '@/lib/auth/actAsSubject';
import { cleanLongFormPlainText } from '@/lib/ai/postProcess';

import { prefillSalaryNegotiation } from '@/lib/ai/prefillFromMemberState';
import { loadCoachContextBlock } from '@/lib/ai/coachContextBlock';
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
  
    const parsed = salaryNegotiationSchema.safeParse(body);
    if (!parsed.success) {
      return createApiErrorResponse(parsed.error.errors[0]?.message ?? 'Validation failed', 'VALIDATION_ERROR', 400);
    }
  
    const { currentOffer, targetSalary, jobTitle, companyName, deliveryMethod, subjectMemberId, sessionId, prefill: shouldPrefill } = parsed.data;
    const onBehalf = await resolveActOnBehalf(user.id, subjectMemberId);
    if (!onBehalf.ok) return NextResponse.json({ error: onBehalf.error }, { status: onBehalf.status });
    const isPhone = deliveryMethod === 'phone';
  
    let finalJobTitle = jobTitle?.trim();
    let finalTargetSalary = targetSalary;
  
    // If no job title provided, try to prefill from member state
    if (!finalJobTitle) {
      if (shouldPrefill) {
        const prefill = await prefillSalaryNegotiation(onBehalf.subjectUserId);
        if (!finalJobTitle) finalJobTitle = prefill.targetRole;
        if (!finalTargetSalary && prefill.targetSalary) {
          // Try to parse numeric salary from string like "$60,000 - $80,000"
          const match = prefill.targetSalary.replace(/[^0-9]/g, '').slice(0, 6);
          if (match) finalTargetSalary = parseInt(match, 10);
        }
      }
    }
  
    const systemPrompt = `You are a salary negotiation coach. Create a word-for-word script for a candidate to use when negotiating.
  
  The script must be tailored to the delivery method:
  - PHONE: Conversational, natural pacing. Include when to pause, when to wait for response. Short phrases they can say one at a time. Include a brief opener and closer.
  - EMAIL: Professional, structured. Clear subject line suggestion. Opening greeting, body paragraphs, closing. Ready to copy-paste.
  
  Format: Plain text, easy to follow. Include [PAUSE] or [WAIT FOR RESPONSE] for phone. For email, include a suggested subject line.${await loadCoachContextBlock(onBehalf.subjectUserId)}`;

    const userPrompt = `Current offer: $${currentOffer.toLocaleString()}
  Target salary: $${(finalTargetSalary ?? targetSalary).toLocaleString()}
  Job title: ${finalJobTitle || jobTitle || 'Not specified'}
  Company: ${companyName || 'Not specified'}
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
  
      const summary = `${companyName || 'Salary negotiation'} — ${finalJobTitle || jobTitle || 'Not specified'} — $${currentOffer} → $${finalTargetSalary ?? targetSalary}`;
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
    return createApiErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
});
