/**
 * Firecrawl integration for employer job import.
 * Scrapes URLs and returns markdown text — handles JS-rendered pages (LinkedIn, ATS, etc.).
 * When FIRECRAWL_API_KEY is set, use this for URL fetches; otherwise fall back to plain fetch.
 */

const API_KEY = process.env.FIRECRAWL_API_KEY;

/** ATS/hosted job-board domains that typically block plain fetch — use Firecrawl first when configured */
const ATS_DOMAINS = [
  'ats.rippling.com',
  'jobs.lever.co',
  'boards.greenhouse.io',
  'greenhouse.io',
  'apply.workable.com',
  'jobs.ashbyhq.com',
  'linkedin.com',
  'www.linkedin.com',
];

export function isAtsOrJsHeavyUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return ATS_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

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

    if (!doc?.markdown?.trim()) {
      console.warn('[Firecrawl] No markdown in response for', url);
      return null;
    }
    const text = String(doc.markdown).trim();
    if (text.length < 50) {
      console.warn('[Firecrawl] Content too short for', url, text.length);
      return null;
    }
    console.log('[Firecrawl] Scraped', url, '→', text.length, 'chars');
    return text;
  } catch (err) {
    console.error('[Firecrawl] Scrape failed for', url, err);
    return null;
  }
}
