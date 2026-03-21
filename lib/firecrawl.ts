/**
 * Firecrawl integration for employer job import.
 * Scrapes URLs and returns markdown text — handles JS-rendered pages (LinkedIn, etc.).
 * When FIRECRAWL_API_KEY is set, use this for URL fetches; otherwise fall back to plain fetch.
 */

const API_KEY = process.env.FIRECRAWL_API_KEY;

export function isFirecrawlConfigured(): boolean {
  return !!API_KEY?.trim();
}

/**
 * Scrape a URL and return markdown text, or null if unavailable.
 * Uses Firecrawl when configured; returns null when not configured (caller should use fetch fallback).
 */
export async function scrapeUrl(url: string): Promise<string | null> {
  if (!isFirecrawlConfigured()) return null;

  try {
    const { default: Firecrawl } = await import('@mendable/firecrawl-js');
    const app = new Firecrawl({ apiKey: API_KEY });
    const doc = await app.scrape(url, { formats: ['markdown'] });

    if (!doc?.markdown?.trim()) return null;
    const text = String(doc.markdown).trim();
    return text.length >= 50 ? text : null;
  } catch {
    return null;
  }
}
