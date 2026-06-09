import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit, checkAICoachUserRateLimit, checkAICoachIpRateLimit } from '@/lib/rate-limit';
import { linkedinHeadlineSchema } from '@/lib/validation/linkedinHeadline';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { resolveActOnBehalf } from '@/lib/auth/actAsSubject';
import { cleanSpokenLine } from '@/lib/ai/postProcess';

import { prefillLinkedInHeadline } from '@/lib/ai/prefillFromMemberState';
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
  
    const parsed = linkedinHeadlineSchema.safeParse(body);
    if (!parsed.success) {
      return createApiErrorResponse(parsed.error.errors[0]?.message ?? 'Validation failed', 'VALIDATION_ERROR', 400);
    }
  
    const { role, keySkills, yearsExperience, subjectMemberId, sessionId, prefill: shouldPrefill } = parsed.data;
    const onBehalf = await resolveActOnBehalf(user.id, subjectMemberId);
    if (!onBehalf.ok) return NextResponse.json({ error: onBehalf.error }, { status: onBehalf.status });
  
    let finalRole = role?.trim();
    let finalKeySkills = keySkills?.trim();
  
    // If no role/skills provided, try to prefill from member state
    if (!finalRole || !finalKeySkills) {
      if (shouldPrefill) {
        const prefill = await prefillLinkedInHeadline(onBehalf.subjectUserId);
        if (!finalRole) finalRole = prefill.targetRole;
        if (!finalKeySkills) finalKeySkills = prefill.strengths;
      }
    }
  
    const systemPrompt = `You are a LinkedIn profile expert. Generate 3 compelling LinkedIn headline options. Each must be under 120 characters. Include the target role and key value props. Use the candidate context below only to better target the role and value props.${await loadCoachContextBlock(onBehalf.subjectUserId)}\n\nFormat as a JSON array of strings: ["headline1", "headline2", "headline3"]. Return ONLY the JSON array — no commentary.`;
  
    const userPrompt = `Role: ${finalRole || 'Not specified'}
  Key skills: ${finalKeySkills || 'Not specified'}
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
      const summary = `${finalRole || 'LinkedIn headline'} — ${(finalKeySkills || '').slice(0, 40)}${(finalKeySkills || '').length > 40 ? '...' : ''}`;
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
    return createApiErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
});
