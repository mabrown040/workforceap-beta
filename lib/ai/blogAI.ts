/**
 * Optional web search via Tavily. Set TAVILY_API_KEY to enable.
 * Used when drafting blog posts to include current info.
 */
export async function webSearch(query: string, maxResults = 5): Promise<string> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return '';

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        query,
        search_depth: 'basic',
        max_results: maxResults,
        include_answer: false,
      }),
    });
    if (!res.ok) return '';
    const data = (await res.json()) as { results?: Array<{ title: string; content: string }> };
    const results = data.results ?? [];
    return results
      .map((r) => `**${r.title}**\n${r.content}`)
      .join('\n\n---\n\n');
  } catch {
    return '';
  }
}

export function isWebSearchConfigured(): boolean {
  return !!process.env.TAVILY_API_KEY;
}
