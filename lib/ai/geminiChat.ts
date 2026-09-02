/**
 * Thin Gemini fallback. No SDK dependency — uses the REST API directly.
 * Set GEMINI_API_KEY to enable. Optional GEMINI_MODEL (default: gemini-2.5-flash).
 */
/** Trimmed: the key is sent as a header/query value (see lib/ai/groq.ts). */
const apiKey = (process.env.GEMINI_API_KEY ?? '').replace(/[\r\n\0]/g, '').trim() || undefined;
const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

export function isGeminiConfigured(): boolean {
  return !!apiKey;
}

export async function geminiChat(
  systemPrompt: string,
  userContent: string,
  opts?: { maxTokens?: number; temperature?: number }
): Promise<string | null> {
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userContent }] }],
    generationConfig: {
      maxOutputTokens: opts?.maxTokens ?? 2000,
      temperature: opts?.temperature ?? 0.7,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`gemini ${res.status}: ${await res.text().catch(() => '')}`);
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ?? null;
}
