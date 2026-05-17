/**
 * Firecrawl-backed live job market signal extraction.
 *
 * For a target O*NET occupation, scrape top public job postings and extract
 * keyword/requirement frequency. Surfaces "must-have" (>=70% of postings) and
 * "nice-to-have" (30-70%) keyword sets that O*NET cannot see (recent tools,
 * frameworks, evolving stack).
 *
 * In-memory TTL cache (24h) keyed on `${onetCode}:${geo}` since postings churn
 * slowly and each scrape costs ~$0.01 + ~5s. Cache resets on server restart;
 * promote to DB later if cold-start cost matters.
 */

const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_POSTINGS = 12;

export interface MarketKeyword {
  phrase: string;
  frequency: number; // 0-1 (fraction of postings containing this phrase)
  category: 'must-have' | 'nice-to-have' | 'occasional';
}

export interface MarketSignal {
  onetCode: string;
  postingCount: number;
  keywords: MarketKeyword[];
  generatedAtMs: number;
  source: 'firecrawl' | 'cache' | 'unavailable';
}

export function isFirecrawlConfigured(): boolean {
  return !!FIRECRAWL_KEY;
}

interface CacheEntry {
  signal: MarketSignal;
  expiresAtMs: number;
}
const cache = new Map<string, CacheEntry>();

// Curated phrase set that we look for in posting bodies. ATS-relevant signals
// the LLM scoring keeps missing: methodologies, tools, motions. We do NOT
// LLM-extract from the postings because that's expensive + noisy; deterministic
// substring counting against this list produces stable signal.
const CANDIDATE_PHRASES: string[] = [
  // Sales methodologies + frameworks
  'MEDDPICC', 'MEDDIC', 'BANT', 'Challenger', 'SPIN selling', 'Sandler', 'Force Management',
  'value selling', 'consultative selling', 'solution selling',
  // Sales tools
  'Salesforce', 'HubSpot', 'Outreach', 'Outreach.io', 'Salesloft', 'Apollo', 'Apollo.io',
  'Gong', 'Chorus', 'Clari', 'ZoomInfo', 'LinkedIn Sales Navigator', 'Sales Navigator',
  'Clay', '6sense', 'Drift', 'Loom',
  // Sales motions
  'outbound prospecting', 'inbound', 'multi-threading', 'multi-thread', 'cold calling',
  'discovery calls', 'demo', 'closing', 'pipeline generation', 'pipeline management',
  'account-based', 'ABM', 'land and expand', 'expansion', 'upsell', 'cross-sell',
  'renewal', 'churn', 'net retention', 'GRR', 'NRR', 'ARR', 'MRR', 'ACV',
  'quota attainment', 'quota carrying',
  // Engineering + tech
  'TypeScript', 'JavaScript', 'Python', 'Go ', 'Rust', 'Java ', 'C#', 'Ruby',
  'React', 'Next.js', 'Vue', 'Angular', 'Svelte',
  'AWS', 'GCP', 'Azure', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD',
  'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API',
  // AI / analytics
  'LLM', 'GPT', 'Claude', 'RAG', 'vector database', 'fine-tuning', 'prompt engineering',
  'SQL', 'Tableau', 'Power BI', 'Looker', 'dbt', 'Snowflake', 'BigQuery',
  // Soft skills (still phrase-matched, lower weight at consumer side)
  'cross-functional', 'stakeholder management', 'executive communication',
];

function cacheKey(onetCode: string, geo: string): string {
  return `${onetCode}::${geo}`;
}

interface FirecrawlSearchResult {
  url?: string;
  markdown?: string;
  content?: string;
  description?: string;
  title?: string;
}

async function firecrawlSearch(query: string, limit: number): Promise<FirecrawlSearchResult[]> {
  if (!FIRECRAWL_KEY) return [];
  const res = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FIRECRAWL_KEY}`,
    },
    body: JSON.stringify({
      query,
      limit,
      scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    throw new Error(`firecrawl search ${res.status}: ${await res.text().catch(() => '')}`);
  }
  const json = (await res.json()) as { data?: FirecrawlSearchResult[] };
  return Array.isArray(json.data) ? json.data : [];
}

function countPhrases(corpus: string[], phrases: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const phrase of phrases) {
    const re = new RegExp(`\\b${escapeRegex(phrase)}\\b`, 'i');
    let hits = 0;
    for (const doc of corpus) {
      if (re.test(doc)) hits++;
    }
    counts.set(phrase, hits);
  }
  return counts;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function classify(frequency: number): MarketKeyword['category'] {
  if (frequency >= 0.7) return 'must-have';
  if (frequency >= 0.3) return 'nice-to-have';
  return 'occasional';
}

/**
 * Fetch live market signal for one occupation. Cached 24h.
 * Returns `source: 'unavailable'` with empty keywords if Firecrawl not configured.
 */
export async function getMarketSignal(
  onetCode: string,
  title: string,
  geo: string = 'United States',
): Promise<MarketSignal> {
  const key = cacheKey(onetCode, geo);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAtMs > now) {
    return { ...hit.signal, source: 'cache' };
  }
  if (!isFirecrawlConfigured()) {
    return {
      onetCode,
      postingCount: 0,
      keywords: [],
      generatedAtMs: now,
      source: 'unavailable',
    };
  }
  let postings: FirecrawlSearchResult[] = [];
  try {
    postings = await firecrawlSearch(
      `"${title}" job posting site:linkedin.com/jobs OR site:greenhouse.io OR site:lever.co ${geo}`,
      MAX_POSTINGS,
    );
  } catch (err) {
    console.error('[marketScrape] firecrawl failed:', err instanceof Error ? err.message : err);
    return {
      onetCode,
      postingCount: 0,
      keywords: [],
      generatedAtMs: now,
      source: 'unavailable',
    };
  }
  const corpus = postings
    .map((p) => p.markdown ?? p.content ?? p.description ?? '')
    .filter((d) => d.length > 200);
  if (corpus.length === 0) {
    const signal: MarketSignal = {
      onetCode,
      postingCount: 0,
      keywords: [],
      generatedAtMs: now,
      source: 'firecrawl',
    };
    cache.set(key, { signal, expiresAtMs: now + CACHE_TTL_MS });
    return signal;
  }
  const counts = countPhrases(corpus, CANDIDATE_PHRASES);
  const keywords: MarketKeyword[] = [];
  for (const [phrase, hits] of counts.entries()) {
    if (hits === 0) continue;
    const freq = hits / corpus.length;
    keywords.push({ phrase, frequency: freq, category: classify(freq) });
  }
  keywords.sort((a, b) => b.frequency - a.frequency);
  const signal: MarketSignal = {
    onetCode,
    postingCount: corpus.length,
    keywords,
    generatedAtMs: now,
    source: 'firecrawl',
  };
  cache.set(key, { signal, expiresAtMs: now + CACHE_TTL_MS });
  return signal;
}

export interface MarketCoverageResult {
  postingCount: number;
  mustHavePresent: MarketKeyword[];
  mustHaveMissing: MarketKeyword[];
  niceToHavePresent: MarketKeyword[];
  coverageScore: number;
  source: MarketSignal['source'];
}

/**
 * Score resume against a market signal: % of must-have keywords present.
 */
export function scoreMarketCoverage(resume: string, signal: MarketSignal): MarketCoverageResult {
  const hay = resume.toLowerCase();
  const present = (kw: MarketKeyword) => hay.includes(kw.phrase.toLowerCase().trim());
  const mustHave = signal.keywords.filter((k) => k.category === 'must-have');
  const niceToHave = signal.keywords.filter((k) => k.category === 'nice-to-have');
  const mustHavePresent = mustHave.filter(present);
  const mustHaveMissing = mustHave.filter((k) => !present(k));
  const niceToHavePresent = niceToHave.filter(present);

  let coverageScore: number;
  if (mustHave.length === 0) {
    // No data — neutral score (don't penalize, don't reward)
    coverageScore = 70;
  } else {
    coverageScore = Math.round((mustHavePresent.length / mustHave.length) * 100);
  }

  return {
    postingCount: signal.postingCount,
    mustHavePresent,
    mustHaveMissing,
    niceToHavePresent,
    coverageScore,
    source: signal.source,
  };
}

export function _resetCacheForTests(): void {
  cache.clear();
}
