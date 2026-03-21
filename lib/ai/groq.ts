import Groq from 'groq-sdk';

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const MODELS = [
  'llama-3.3-70b-versatile',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3-32b',
  'llama-3.1-8b-instant',
] as const;

const RATE_LIMIT_BACKOFF_MS = 2200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessageFromUnknown(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return String(err);
}

/** True when Groq (or transport) reports throttling / overload so callers can return 429. */
export function isGroqRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const o = err as {
    status?: number;
    message?: string;
    error?: { message?: string };
    code?: string;
  };
  if (o.status === 429) return true;
  if (o.code === 'rate_limit_exceeded') return true;
  const m = String(o.message ?? o.error?.message ?? '').toLowerCase();
  return (
    m.includes('rate limit') ||
    m.includes('too many requests') ||
    m.includes('capacity') ||
    m.includes('overloaded') ||
    m.includes('throttl')
  );
}

export function groqErrorMessage(err: unknown): string {
  return errorMessageFromUnknown(err);
}

const RATE_LIMIT_USER_MESSAGE =
  'The AI provider is rate-limited. Wait a minute and try again, or avoid running several AI actions back-to-back.';

/** Shared shape for admin blog AI routes — avoids duplicating 429 vs 500 handling. */
export function groqRouteErrorResult(err: unknown, genericMessage: string) {
  const rateLimited = isGroqRateLimitError(err);
  return {
    status: rateLimited ? (429 as const) : (500 as const),
    body: {
      error: rateLimited ? RATE_LIMIT_USER_MESSAGE : genericMessage,
      detail: process.env.NODE_ENV === 'development' ? groqErrorMessage(err) : undefined,
    },
    headers: rateLimited ? ({ 'Retry-After': '60' } as Record<string, string>) : undefined,
  };
}

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
      if (isGroqRateLimitError(err)) {
        await sleep(RATE_LIMIT_BACKOFF_MS);
      }
      continue;
    }
  }

  if (lastError) throw lastError;
  return null;
}

export function isAIConfigured() {
  return !!process.env.GROQ_API_KEY;
}
