import Groq from 'groq-sdk';

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const DEFAULT_MODEL = 'llama-3.1-70b-versatile';

export async function chatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { maxTokens?: number; temperature?: number }
) {
  if (!groq) return null;

  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL ?? DEFAULT_MODEL,
    messages,
    max_tokens: options?.maxTokens ?? 4000,
    temperature: options?.temperature ?? 0.7,
  });

  return completion.choices[0]?.message?.content?.trim() ?? null;
}

export function isAIConfigured() {
  return !!process.env.GROQ_API_KEY;
}
