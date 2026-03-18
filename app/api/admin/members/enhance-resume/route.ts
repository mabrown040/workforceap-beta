import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!isAIConfigured())
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const resume = typeof (body as { resume?: string }).resume === 'string'
    ? (body as { resume: string }).resume.trim()
    : '';
  const programTitle = typeof (body as { programTitle?: string }).programTitle === 'string'
    ? (body as { programTitle: string }).programTitle
    : 'their target role';

  if (!resume) {
    return NextResponse.json({ error: 'Resume text is required' }, { status: 400 });
  }

  const systemPrompt = `You are a professional resume writer. Improve this resume to target: ${programTitle}.

Guidelines:
- Use strong action verbs (Led, Achieved, Implemented)
- Add quantifiable metrics where possible
- Include keywords relevant to the target program/role
- Keep the person's actual experience accurate—do not invent roles
- Format as plain text with clear section headers (Experience, Education, Skills)
- Output the improved resume in full

Your response must have two parts:
1. IMPROVED RESUME: The full improved resume
2. IMPROVEMENT SUMMARY: 3-5 bullet points of what changed and why`;

  try {
    const output = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: resume.slice(0, 8000) },
      ],
      { maxTokens: 2000, temperature: 0.5 }
    );

    if (!output) return NextResponse.json({ error: 'No response from AI' }, { status: 500 });

    const improvedMatch = output.match(/IMPROVED RESUME:?\s*([\s\S]*?)(?=IMPROVEMENT SUMMARY|$)/i);
    const summaryMatch = output.match(/IMPROVEMENT SUMMARY:?\s*([\s\S]*?)$/i);
    const improvedResume = improvedMatch?.[1]?.trim() || output;
    const improvementSummary = summaryMatch?.[1]?.trim() || '';

    return NextResponse.json({
      enhancedResume: improvedResume,
      improvementSummary: improvementSummary.split(/\n/).filter(Boolean),
    });
  } catch (err) {
    console.error('Enhance resume error:', err);
    return NextResponse.json({ error: 'Failed to enhance resume' }, { status: 500 });
  }
}
