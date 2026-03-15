import Groq from 'groq-sdk';

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'] as const;

export async function chatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { maxTokens?: number; temperature?: number }
) {
  if (!groq) return null;

  const maxTokens = Math.min(options?.maxTokens ?? 4000, 8192);
  const temperature = options?.temperature ?? 0.7;
  const modelOverride = process.env.GROQ_MODEL;
  const modelsToTry = modelOverride ? [modelOverride, ...MODELS] : MODELS;
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      });
      const output = completion.choices[0]?.message?.content?.trim();
      if (output) return output;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue;
    }
  }

  if (lastError) throw lastError;
  return null;
}

export function isAIConfigured() {
  return !!process.env.GROQ_API_KEY;
}
