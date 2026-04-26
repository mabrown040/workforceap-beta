import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { isAnthropicConfigured } from '@/lib/ai/anthropicChat';
import { chatCompletion, isAIConfigured as isGroqConfigured } from '@/lib/ai/groq';
import { geminiChat, isGeminiConfigured } from '@/lib/ai/geminiChat';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Admin-only probe of the multi-provider AI fallback chain.
 *
 * Calls each configured provider directly with a tiny "say hi" prompt and
 * reports per-provider status, latency, and a snippet of the response. The
 * normal /api/member/* AI tools use a fallback chain that hides which
 * provider served a request — this endpoint exists so ops can verify each
 * provider independently after env-var changes (e.g. rotating API keys).
 *
 * Returns { providers: [{ name, configured, ok, latencyMs, sample, error }] }.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const systemPrompt = 'You are a diagnostic probe. Reply with exactly: "OK"';
  const userContent = 'Diagnostic ping.';
  const providers: Array<{
    name: string;
    configured: boolean;
    ok: boolean;
    latencyMs: number | null;
    sample: string | null;
    error: string | null;
  }> = [];

  // Anthropic
  {
    const configured = isAnthropicConfigured();
    let ok = false;
    let sample: string | null = null;
    let error: string | null = null;
    let latencyMs: number | null = null;
    if (configured) {
      const t0 = Date.now();
      try {
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
        const msg = await client.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 32,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
        });
        const block = msg.content[0];
        sample = block?.type === 'text' ? block.text : null;
        ok = !!sample;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      } finally {
        latencyMs = Date.now() - t0;
      }
    }
    providers.push({ name: 'anthropic', configured, ok, latencyMs, sample, error });
  }

  // Groq
  {
    const configured = isGroqConfigured();
    let ok = false;
    let sample: string | null = null;
    let error: string | null = null;
    let latencyMs: number | null = null;
    if (configured) {
      const t0 = Date.now();
      try {
        sample = await chatCompletion(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          { maxTokens: 32, temperature: 0 }
        );
        ok = !!sample;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      } finally {
        latencyMs = Date.now() - t0;
      }
    }
    providers.push({ name: 'groq', configured, ok, latencyMs, sample, error });
  }

  // Gemini
  {
    const configured = isGeminiConfigured();
    let ok = false;
    let sample: string | null = null;
    let error: string | null = null;
    let latencyMs: number | null = null;
    if (configured) {
      const t0 = Date.now();
      try {
        sample = await geminiChat(systemPrompt, userContent, { maxTokens: 32, temperature: 0 });
        ok = !!sample;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      } finally {
        latencyMs = Date.now() - t0;
      }
    }
    providers.push({ name: 'gemini', configured, ok, latencyMs, sample, error });
  }

  const summary = {
    healthyCount: providers.filter((p) => p.ok).length,
    configuredCount: providers.filter((p) => p.configured).length,
    chainHealthy: providers.some((p) => p.ok), // any provider working = users get responses
  };

  return NextResponse.json({ summary, providers });
}
