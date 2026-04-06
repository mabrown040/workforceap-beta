/**
 * Parse a fetch Response body as JSON without throwing on empty/HTML/error pages.
 */
export async function safeParseResponseJson<T = unknown>(
  res: Response
): Promise<{ ok: boolean; status: number; data: T | null; parseError: boolean; rawSnippet: string }> {
  const text = await res.text();
  const rawSnippet = text.length > 200 ? `${text.slice(0, 200)}…` : text;
  if (!text.trim()) {
    return { ok: res.ok, status: res.status, data: null, parseError: true, rawSnippet: '' };
  }
  try {
    const data = JSON.parse(text) as T;
    return { ok: res.ok, status: res.status, data, parseError: false, rawSnippet };
  } catch {
    return { ok: false, status: res.status, data: null, parseError: true, rawSnippet };
  }
}
