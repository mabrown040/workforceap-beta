/**
 * Gemini embeddings via REST. Uses text-embedding-004 by default (768-dim, free tier 1500 req/day).
 * Set GEMINI_API_KEY to enable. Optional GEMINI_EMBED_MODEL.
 */
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_EMBED_MODEL ?? 'gemini-embedding-001';

export function isGeminiEmbedConfigured(): boolean {
  return !!apiKey;
}

export interface EmbedResult {
  values: number[];
}

const cache = new Map<string, number[]>();
const CACHE_MAX = 500;

async function embedSingle(text: string): Promise<number[] | null> {
  if (!apiKey) return null;
  const key = `${model}:${text.length}:${text.slice(0, 200)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`;
  const body = {
    model: `models/${model}`,
    content: { parts: [{ text }] },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`gemini embed ${res.status}: ${await res.text().catch(() => '')}`);
  }
  const json = (await res.json()) as { embedding?: { values?: number[] } };
  const values = json.embedding?.values;
  if (!values) return null;
  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, values);
  return values;
}

export async function embedTexts(texts: string[]): Promise<Array<number[] | null>> {
  // Concurrent with cap (Gemini rate limit ~150 req/min on free tier)
  const out: Array<number[] | null> = new Array(texts.length).fill(null);
  const CONCURRENCY = 5;
  for (let i = 0; i < texts.length; i += CONCURRENCY) {
    const batch = texts.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((t) =>
        embedSingle(t).catch((err) => {
          console.error('[geminiEmbed] failed:', err instanceof Error ? err.message : err);
          return null;
        })
      )
    );
    for (let j = 0; j < results.length; j++) out[i + j] = results[j];
  }
  return out;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function _resetCacheForTests(): void {
  cache.clear();
}
