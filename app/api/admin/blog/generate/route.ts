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
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return NextResponse.json({ error: 'Topic/angle is required' }, { status: 400 });
  }

  const { title, topic, tone, category } = parsed;

  const systemPrompt = `You are a content writer for WorkforceAP, a no-cost career training program in Austin, TX serving underserved communities, adult learners, and veterans. Write a blog post that is ${tone}, approximately 400 words, in the ${category} category. The post should be authentic, specific, and avoid generic filler. Do not mention cost or pricing — use "no-cost training for qualifying participants" if relevant. Return a JSON object with exactly these keys: title (string), excerpt (1-2 sentences), content (markdown string).`;

  const userPrompt = title
    ? `Write a blog post titled "${title}" about the following topic/angle: ${topic}`
    : `Write a blog post about the following topic/angle: ${topic}. Generate an engaging title.`;

  try {
    const output = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 2000, temperature: 0.7 }
    );

    if (!output) return NextResponse.json({ error: 'No response from AI' }, { status: 500 });

    const cleaned = output.replace(/```json?\s*/g, '').replace(/```\s*$/g, '').trim();
    const parsedOutput = JSON.parse(cleaned) as { title?: string; excerpt?: string; content?: string };

    return NextResponse.json({
      title: parsedOutput.title ?? '',
      excerpt: parsedOutput.excerpt ?? '',
      content: parsedOutput.content ?? '',
    });
  } catch (err) {
    console.error('Blog generate error:', err);
    return NextResponse.json(
      { error: 'Generation failed — check your API key or try again' },
      { status: 500 }
    );
  }
}

function parseBody(body: unknown): {
  title: string;
  topic: string;
  tone: string;
  category: string;
} | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const topic = typeof o.topic === 'string' ? o.topic.trim() : '';
  const tone = typeof o.tone === 'string' ? o.tone.trim() || 'Informative' : 'Informative';
  const category = typeof o.category === 'string' ? o.category.trim() || 'Career Tips' : 'Career Tips';
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  if (!topic) return null;
  return { title, topic, tone, category };
}
