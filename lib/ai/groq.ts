import Groq from 'groq-sdk';
import Anthropic from '@anthropic-ai/sdk';
import { isAIConfigured } from '@/lib/ai/configured';
import { geminiChat, isGeminiConfigured } from '@/lib/ai/geminiChat';

export { isAIConfigured } from '@/lib/ai/configured';

/**
 * Keys become Authorization headers, so they are stripped of CR/LF/NUL and
 * trimmed. `isAIConfigured()` already trims when deciding whether a provider
 * exists; constructing the client with the raw value made the two disagree,
 * and a pasted trailing newline then failed every call at request time.
 */
function providerKey(raw: string | undefined): string {
  return (raw ?? '').replace(/[\r\n\0]/g, '').trim();
}

const groqKey = providerKey(process.env.GROQ_API_KEY);
const anthropicKey = providerKey(process.env.ANTHROPIC_API_KEY);
const groq = groqKey ? new Groq({ apiKey: groqKey }) : null;
const anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;

const MODELS = [
  'llama-3.3-70b-versatile',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3-32b',
  'llama-3.1-8b-instant',
] as const;

export function isGroqConfigured(): boolean {
  return !!groq;
}

/** Groq-only completion. Used by claudeChat so the provider chain cannot recurse. */
export async function groqChatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { maxTokens?: number; temperature?: number },
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

function splitSystemUser(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
): { system: string; user: string } {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const user = messages
    .filter((m) => m.role !== 'system')
    .map((m) => m.content)
    .join('\n\n');
  return { system, user };
}

/**
 * Member-tool completion with Groq → Anthropic → Gemini fallback.
 * `/api/ai/*` routes call this; they used to die when only Anthropic/Gemini
 * was configured.
 */
export async function chatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { maxTokens?: number; temperature?: number },
) {
  if (!isAIConfigured()) return null;

  const errors: string[] = [];

  if (groq) {
    try {
      const text = await groqChatCompletion(messages, options);
      if (text) return text;
      errors.push('groq: empty response');
    } catch (err) {
      errors.push(`groq: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const { system, user } = splitSystemUser(messages);

  if (anthropic) {
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: options?.maxTokens ?? 2000,
        system: system || 'You are a helpful assistant.',
        messages: [{ role: 'user', content: user }],
      });
      const block = msg.content[0];
      const text = block?.type === 'text' ? block.text : null;
      if (text) {
        console.warn('[ai] served via anthropic fallback (groq unavailable)');
        return text;
      }
      errors.push('anthropic: empty response');
    } catch (err) {
      errors.push(`anthropic: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (isGeminiConfigured()) {
    try {
      const text = await geminiChat(system || 'You are a helpful assistant.', user, options);
      if (text) {
        console.warn('[ai] served via gemini fallback (groq + anthropic unavailable)');
        return text;
      }
      errors.push('gemini: empty response');
    } catch (err) {
      errors.push(`gemini: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (errors.length > 0) {
    console.error('[ai] chatCompletion providers failed:', errors.join(' | '));
    throw new Error(errors[errors.length - 1] ?? 'All AI providers failed');
  }
  return null;
}
