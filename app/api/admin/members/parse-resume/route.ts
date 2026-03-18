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

  const resumeText = typeof (body as { resume?: string }).resume === 'string'
    ? (body as { resume: string }).resume.trim()
    : '';
  if (!resumeText) {
    return NextResponse.json({ error: 'Resume text is required' }, { status: 400 });
  }

  const systemPrompt = `Extract structured data from this resume. Return a JSON object with:
- extracted_name: string (full name)
- extracted_email: string
- extracted_phone: string
- extracted_jobs: array of { title, employer, dates }
- extracted_skills: array of strings
- extracted_education: array of strings

Output ONLY the JSON object, no other text. Use empty string or empty array if not found.`;

  try {
    const output = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: resumeText.slice(0, 8000) },
      ],
      { maxTokens: 800, temperature: 0.2 }
    );

    if (!output) return NextResponse.json({ error: 'No response from AI' }, { status: 500 });

    const cleaned = output.replace(/```json?\s*/g, '').replace(/```\s*$/g, '').trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    return NextResponse.json({ extracted: parsed });
  } catch (err) {
    console.error('Parse resume error:', err);
    return NextResponse.json({ error: 'Failed to parse resume' }, { status: 500 });
  }
}
