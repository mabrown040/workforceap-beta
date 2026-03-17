import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import type { CareerBriefContext } from '@/lib/content/careerBriefPersonalization';

export async function generatePersonalizedBriefSection(
  context: CareerBriefContext,
  briefTitle: string
): Promise<string | null> {
  if (!isAIConfigured()) return null;

  const { location, programShortLabel, applicationsCount, toolsUsed, recommendedActions } = context;

  const systemPrompt = `You are a professional career coach writing for WorkforceAP, a workforce development organization helping job seekers. Write 2-3 short, actionable paragraphs (each 2-4 sentences) personalized to the member's situation. Be warm but professional. Use second person ("you"). Do not mention WIOA, government programs, or employer partners. Focus on practical next steps. Output plain text only, no markdown or bullet points.`;

  const userPrompt = `Write a personalized "This Week for You" section for a Career Brief titled "${briefTitle}".

Member context:
- Location: ${location || 'Not specified'}
- Career focus: ${programShortLabel || 'Not specified'}
- Applications logged: ${applicationsCount}
- AI tools used: ${toolsUsed.length > 0 ? toolsUsed.join(', ') : 'None yet'}
- Recommended actions: ${recommendedActions.map((a) => a.label).join('; ')}

Write 2-3 concise paragraphs that feel personally relevant. If they have few applications, encourage tracking. If they haven't used key tools, suggest one. If they have location/career data, acknowledge it. Keep total length under 200 words.`;

  try {
    const output = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 400, temperature: 0.7 }
    );
    return output?.trim() || null;
  } catch {
    return null;
  }
}
