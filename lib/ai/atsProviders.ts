/**
 * ATS Provider Parsers
 * 
 * Tier 1: Public API integrations (Greenhouse, Lever, Ashby)
 * Tier 2: Server-rendered HTML parsing (BuiltIn, generic)
 * Tier 3: JS-rendered fallback detection with user guidance
 */

import { sanitizeScrapedJobText } from '@/lib/ai/parseJob';
import { safeFetch, UnsafeUrlError } from '@/lib/http/safeOutboundFetch';

export interface ATSJob {
  title: string;
  description: string;
  location?: string;
  locationType?: 'remote' | 'hybrid' | 'onsite';
  jobType?: 'fulltime' | 'parttime' | 'contract';
  salaryMin?: number;
  salaryMax?: number;
  company?: string;
  sourceUrl?: string;
  requirements?: string[];
}

export interface ATSParseResult {
  provider: string;
  jobs: ATSJob[];
  errors: string[];
  /** Raw page text when available (for AI parsing by caller) */
  rawText?: string;
}

// ────────────────────────────────────────────────────────────
// Provider Detection
// ────────────────────────────────────────────────────────────

interface ProviderMatch {
  provider: string;
  company: string;
  isJobList: boolean;
  jobId?: string;
}

const PROVIDER_PATTERNS: { pattern: RegExp; provider: string; companyGroup: number; jobIdGroup?: number }[] = [
  // Greenhouse: boards.greenhouse.io/{company}/jobs or boards.greenhouse.io/{company}/jobs/{id}
  { pattern: /boards\.greenhouse\.io\/([^/]+)\/jobs(?:\/(\d+))?/i, provider: 'greenhouse', companyGroup: 1, jobIdGroup: 2 },
  // Lever: jobs.lever.co/{company} or jobs.lever.co/{company}/{id}
  { pattern: /jobs\.lever\.co\/([^/]+)(?:\/([a-f0-9-]+))?/i, provider: 'lever', companyGroup: 1, jobIdGroup: 2 },
  // Ashby: jobs.ashbyhq.com/{company} or jobs.ashbyhq.com/{company}/{id}
  { pattern: /jobs\.ashbyhq\.com\/([^/]+)(?:\/([a-f0-9-]+))?/i, provider: 'ashby', companyGroup: 1, jobIdGroup: 2 },
  // Rippling ATS: ats.rippling.com/{company}/jobs or ats.rippling.com/en-US/{company}/jobs/{id}
  { pattern: /ats\.rippling\.com\/(?:en-\w+\/)?([^/]+)\/jobs(?:\/([a-f0-9-]+))?/i, provider: 'rippling', companyGroup: 1, jobIdGroup: 2 },
  // Workday: {company}.wd{n}.myworkdayjobs.com
  { pattern: /([^.]+)\.wd\d+\.myworkdayjobs\.com/i, provider: 'workday', companyGroup: 1 },
  // iCIMS: careers-{company}.icims.com or {company}.icims.com
  { pattern: /(?:careers-)?([^.]+)\.icims\.com/i, provider: 'icims', companyGroup: 1 },
  // BuiltIn: builtinaustin.com/jobs or builtinaustin.com/company/{slug}/jobs
  { pattern: /builtin(?:austin|chicago|colorado|boston|la|nyc|seattle|sf)?\.com/i, provider: 'builtin', companyGroup: 0 },
];

export function detectProvider(url: string): ProviderMatch | null {
  for (const { pattern, provider, companyGroup, jobIdGroup } of PROVIDER_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      const company = companyGroup === 0 ? '' : (match[companyGroup] ?? '');
      const jobId = jobIdGroup ? match[jobIdGroup] : undefined;
      return {
        provider,
        company,
        isJobList: !jobId,
        jobId,
      };
    }
  }
  return null;
}

export function isKnownStructuredApiProvider(provider: string | null | undefined): boolean {
  return provider === 'greenhouse' || provider === 'lever' || provider === 'ashby';
}

export function isLikelyJobDetailUrl(url: string): boolean {
  const detected = detectProvider(url);
  if (detected) return !detected.isJobList;
  return /(?:\/jobs?\/[^/?#]+|\/job\/[^/?#]+|\/positions?\/[^/?#]+|[?&](?:job|jobid|job_id|gh_jid|postingId|reqid)=)/i.test(url);
}

export function getImportWaitForMs(url: string): number {
  const provider = detectProvider(url)?.provider;
  if (provider === 'rippling' || provider === 'workday' || provider === 'icims') {
    return 4500;
  }
  return 2000;
}

// ────────────────────────────────────────────────────────────
// Tier 1: Public API Parsers
// ────────────────────────────────────────────────────────────

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; WorkforceAP/1.0)',
  'Accept': 'application/json',
};

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|h[1-6]|tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .trim();
}

export function extractMeaningfulPageText(html: string): { text: string; isUsable: boolean } {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyText = bodyMatch?.[1] ?? html;
  const stripped = stripHtml(bodyText);
  const cleaned = sanitizeScrapedJobText(stripped);

  if (cleaned.length < 200) {
    return { text: cleaned, isUsable: false };
  }

  return { text: cleaned.slice(0, 28000), isUsable: true };
}

// ────────────────────────────────────────────────────────────
// Content Quality Detection
// ────────────────────────────────────────────────────────────

/** Patterns that indicate the scraped content is junk/not usable */
const JUNK_CONTENT_PATTERNS = [
  // Cookie/consent walls
  /cookie\s*(?:policy|consent|settings|banner)/i,
  /accept\s*(?:all\s*)?cookies/i,
  /manage\s*consent/i,
  /privacy\s*(?:policy|notice|settings)/i,
  /gdpr\s*(?:notice|compliance)/i,
  // JavaScript loading states
  /loading\.\.\./i,
  /please\s*wait/i,
  /javascript\s*(?:is\s*)?required/i,
  /enable\s*javascript/i,
  /browser\s*not\s*supported/i,
  // Cloudflare/anti-bot
  /checking\s*(?:your\s*)?browser/i,
  /verify\s*(?:you\s*are\s*)?human/i,
  /ddos\s*protection/i,
  /ray\s*id/i,
  // Login gates
  /sign\s*in\s*(?:to\s*)?continue/i,
  /log\s*in\s*(?:to\s*)?view/i,
  /authentication\s*required/i,
  /members\s*only/i,
  // Generic error pages
  /404\s*(?:not\s*)?found/i,
  /page\s*not\s*found/i,
  /access\s*denied/i,
  /forbidden/i,
  /unauthorized/i,
  /something\s*went\s*wrong/i,
  /error\s*occurred/i,
];

/** Minimum meaningful content thresholds */
const MIN_CONTENT_LENGTH = 300;
const MIN_MEANINGFUL_WORDS = 30;

/** Check if content appears to be junk/cookie wall/bot block */
function isJunkContent(text: string): boolean {
  if (!text || text.length < MIN_CONTENT_LENGTH) return true;
  
  // Count actual words (not just characters)
  const words = text.split(/\s+/).filter(w => w.length > 2);
  if (words.length < MIN_MEANINGFUL_WORDS) return true;
  
  // Check for junk patterns
  const lowerText = text.slice(0, 2000).toLowerCase();
  for (const pattern of JUNK_CONTENT_PATTERNS) {
    if (pattern.test(lowerText)) {
      // If the entire content is just the junk pattern, it's junk
      if (text.length < 1000) return true;
      // If junk pattern appears prominently in first 500 chars, likely junk
      const first500 = text.slice(0, 500).toLowerCase();
      if (pattern.test(first500)) {
        // Check if there's actually job content after the junk
        const hasJobContent = /\b(job|position|role|responsibilities?|qualifications?|requirements?|experience|skills?)\b/i.test(text.slice(500));
        if (!hasJobContent) return true;
      }
    }
  }
  
  return false;
}

/** Detect if content is likely a job posting (has job-specific keywords) */
function hasJobContentIndicators(text: string): boolean {
  const indicators = [
    /\b(job\s*(?:title|description)|position|role)\b/i,
    /\b(responsibilities?|duties?|what\s*you['']?ll\s*do)\b/i,
    /\b(qualifications?|requirements?|what\s*you\s*need)\b/i,
    /\b(experience\s*(?:required|preferred)|years?\s*of\s*experience)\b/i,
    /\b(skills?|competencies?)\b/i,
    /\b(benefits?|compensation|salary|pay)\b/i,
    /\b(apply\s*now|application)\b/i,
  ];
  
  const lowerText = text.toLowerCase();
  let matchCount = 0;
  for (const pattern of indicators) {
    if (pattern.test(lowerText)) matchCount++;
  }
  
  // Need at least 2 indicators to be confident it's job content
  return matchCount >= 2;
}

export interface ContentQualityResult {
  isUsable: boolean;
  isJunk: boolean;
  hasJobIndicators: boolean;
  reason?: string;
}

export function checkContentQuality(text: string): ContentQualityResult {
  if (!text || text.length < MIN_CONTENT_LENGTH) {
    return {
      isUsable: false,
      isJunk: true,
      hasJobIndicators: false,
      reason: `Content too short (${text?.length ?? 0} chars, need ${MIN_CONTENT_LENGTH}+)`,
    };
  }
  
  const isJunk = isJunkContent(text);
  const hasJobIndicators = hasJobContentIndicators(text);
  
  if (isJunk && !hasJobIndicators) {
    return {
      isUsable: false,
      isJunk: true,
      hasJobIndicators: false,
      reason: 'Content appears to be a cookie wall, login gate, or anti-bot page',
    };
  }
  
  if (!hasJobIndicators) {
    return {
      isUsable: false,
      isJunk: false,
      hasJobIndicators: false,
      reason: 'Content does not appear to be a job posting (missing job-specific keywords)',
    };
  }
  
  return {
    isUsable: true,
    isJunk: false,
    hasJobIndicators: true,
  };
}

function inferLocationType(location: string | undefined): 'remote' | 'hybrid' | 'onsite' | undefined {
  if (!location) return undefined;
  const lower = location.toLowerCase();
  if (lower.includes('remote')) return 'remote';
  if (lower.includes('hybrid')) return 'hybrid';
  if (lower.includes('on-site') || lower.includes('onsite') || lower.includes('in-office')) return 'onsite';
  return 'onsite'; // default for physical locations
}

// ── Greenhouse ──────────────────────────────────────────────

async function fetchGreenhouseJobs(company: string, jobId?: string): Promise<ATSParseResult> {
  const errors: string[] = [];
  const jobs: ATSJob[] = [];

  try {
    if (jobId) {
      // Single job
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}`, { headers: FETCH_HEADERS });
      if (!res.ok) { errors.push(`Greenhouse API returned ${res.status}`); return { provider: 'greenhouse', jobs, errors }; }
      const data = await res.json();
      jobs.push(greenhouseJobToATS(data, company));
    } else {
      // All jobs
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`, { headers: FETCH_HEADERS });
      if (!res.ok) { errors.push(`Greenhouse API returned ${res.status}`); return { provider: 'greenhouse', jobs, errors }; }
      const data = await res.json();
      const jobList = data.jobs ?? [];
      for (const job of jobList.slice(0, 50)) {
        jobs.push(greenhouseJobToATS(job, company));
      }
    }
  } catch (e) {
    errors.push(`Greenhouse fetch failed: ${e instanceof Error ? e.message : 'unknown error'}`);
  }

  return { provider: 'greenhouse', jobs, errors };
}

function greenhouseJobToATS(job: Record<string, unknown>, company: string): ATSJob {
  const loc = job.location as { name?: string } | undefined;
  const content = typeof job.content === 'string' ? stripHtml(job.content) : '';
  return {
    title: (job.title as string) ?? 'Untitled',
    description: content || 'No description available.',
    location: loc?.name,
    locationType: inferLocationType(loc?.name),
    company,
    sourceUrl: (job.absolute_url as string) ?? undefined,
  };
}

// ── Lever ───────────────────────────────────────────────────

async function fetchLeverJobs(company: string, jobId?: string): Promise<ATSParseResult> {
  const errors: string[] = [];
  const jobs: ATSJob[] = [];

  try {
    if (jobId) {
      const res = await fetch(`https://api.lever.co/v0/postings/${company}/${jobId}`, { headers: FETCH_HEADERS });
      if (!res.ok) { errors.push(`Lever API returned ${res.status}`); return { provider: 'lever', jobs, errors }; }
      const data = await res.json();
      jobs.push(leverJobToATS(data, company));
    } else {
      const res = await fetch(`https://api.lever.co/v0/postings/${company}`, { headers: FETCH_HEADERS });
      if (!res.ok) { errors.push(`Lever API returned ${res.status}`); return { provider: 'lever', jobs, errors }; }
      const data = await res.json();
      for (const posting of (data as unknown[]).slice(0, 50)) {
        jobs.push(leverJobToATS(posting as Record<string, unknown>, company));
      }
    }
  } catch (e) {
    errors.push(`Lever fetch failed: ${e instanceof Error ? e.message : 'unknown error'}`);
  }

  return { provider: 'lever', jobs, errors };
}

function leverJobToATS(posting: Record<string, unknown>, company: string): ATSJob {
  const categories = posting.categories as Record<string, string> | undefined;
  const location = categories?.location ?? (posting.workplaceType as string) ?? undefined;
  const lists = posting.lists as { text: string; content: string }[] | undefined;
  const descParts: string[] = [];
  if (posting.descriptionPlain) descParts.push(posting.descriptionPlain as string);
  if (lists?.length) {
    for (const list of lists) {
      descParts.push(`\n${list.text}\n${stripHtml(list.content)}`);
    }
  }
  if (posting.additionalPlain) descParts.push(posting.additionalPlain as string);

  return {
    title: (posting.text as string) ?? 'Untitled',
    description: descParts.join('\n\n') || 'No description available.',
    location,
    locationType: inferLocationType(location),
    company,
    sourceUrl: (posting.hostedUrl as string) ?? undefined,
  };
}

// ── Ashby ───────────────────────────────────────────────────

async function fetchAshbyJobs(company: string, jobId?: string): Promise<ATSParseResult> {
  const errors: string[] = [];
  const jobs: ATSJob[] = [];

  try {
    if (jobId) {
      const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${company}/posting/${jobId}`, { headers: FETCH_HEADERS });
      if (!res.ok) { errors.push(`Ashby API returned ${res.status}`); return { provider: 'ashby', jobs, errors }; }
      const data = await res.json();
      jobs.push(ashbyJobToATS(data, company));
    } else {
      const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${company}`, { headers: FETCH_HEADERS });
      if (!res.ok) { errors.push(`Ashby API returned ${res.status}`); return { provider: 'ashby', jobs, errors }; }
      const data = await res.json();
      const postings = (data as { jobs?: unknown[] }).jobs ?? [];
      for (const posting of postings.slice(0, 50)) {
        jobs.push(ashbyJobToATS(posting as Record<string, unknown>, company));
      }
    }
  } catch (e) {
    errors.push(`Ashby fetch failed: ${e instanceof Error ? e.message : 'unknown error'}`);
  }

  return { provider: 'ashby', jobs, errors };
}

function ashbyJobToATS(posting: Record<string, unknown>, company: string): ATSJob {
  const location = (posting.location as string) ?? (posting.locationName as string) ?? undefined;
  const descHtml = (posting.descriptionHtml as string) ?? (posting.description as string) ?? '';
  return {
    title: (posting.title as string) ?? 'Untitled',
    description: stripHtml(descHtml) || 'No description available.',
    location,
    locationType: inferLocationType(location),
    company,
    sourceUrl: (posting.jobUrl as string) ?? (posting.applyUrl as string) ?? undefined,
  };
}

// ────────────────────────────────────────────────────────────
// Tier 2: Generic HTML Fetch + Parse
// ────────────────────────────────────────────────────────────

async function fetchGenericPage(url: string): Promise<{ text: string; isJSRendered: boolean } | null> {
  try {
    // SSRF guard + 2 MB body cap + 15s timeout. `url` is supplied by an
    // authenticated user (member or employer) via the job-import form,
    // so we must block private IP literals (AWS IMDS, localhost) and
    // cap response size to prevent giant-page DoS.
    const res = await safeFetch(url, {
      httpsOnly: false, // some job-board APIs still serve http
      timeoutMs: 15_000,
      maxBytes: 2 * 1024 * 1024,
      headers: { ...FETCH_HEADERS, 'Accept': 'text/html,application/xhtml+xml' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const extracted = extractMeaningfulPageText(html);

    if (!extracted.isUsable) {
      return { text: extracted.text, isJSRendered: true };
    }

    return { text: extracted.text, isJSRendered: false };
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      console.warn('[atsProviders] fetchGenericPage rejected unsafe URL', err.message);
    }
    return null;
  }
}

// ────────────────────────────────────────────────────────────
// Tier 3: JS-Rendered Providers (user guidance)
// ────────────────────────────────────────────────────────────

const JS_RENDERED_PROVIDERS = ['rippling', 'workday', 'icims'];

function getJSRenderedGuidance(provider: string): string {
  const tips: Record<string, string> = {
    rippling: 'Rippling ATS uses JavaScript rendering. Try pasting individual job URLs (e.g., ats.rippling.com/en-US/company/jobs/abc123) or copy-paste the job description text.',
    workday: 'Workday career pages require JavaScript. Please copy-paste individual job descriptions or use direct job links.',
    icims: 'iCIMS career pages require JavaScript. Please copy-paste the job description text from each listing.',
  };
  return tips[provider] ?? 'This career page requires JavaScript to render. Please paste the job description text directly, or use individual job URLs.';
}

// ────────────────────────────────────────────────────────────
// Tier 3: Firecrawl (JS-rendered page scraping)
// ────────────────────────────────────────────────────────────

/** True when Firecrawl API calls can be attempted (optional in dev). */
export function isFirecrawlConfigured(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY?.trim());
}

/** Structured error returned by fetchPageText / fetchSubJobPageText so callers can distinguish retryable vs permanent failures. */
export type FetchPageError = {
  error: 'rate_limited' | 'quota_exceeded' | 'fetch_failed';
  retryAfterMs?: number;
};

async function fetchWithFirecrawl(url: string, options?: { waitFor?: number }): Promise<{ text: string } | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.warn('[Firecrawl] FIRECRAWL_API_KEY not set — skipping scrape (use paste or direct job URLs)');
    return null;
  }

  try {
    const body: Record<string, unknown> = { url, formats: ['markdown'] };
    if (options?.waitFor && options.waitFor > 0) {
      body.waitFor = options.waitFor;
    }

    const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as {
      success?: boolean;
      data?: { markdown?: string };
      error?: string;
      code?: string;
    };
    const markdown = json.data?.markdown;
    const errLower = (json.error ?? json.code ?? '').toString().toLowerCase();

    if (res.status === 429) {
      console.warn(`[Firecrawl] HTTP ${res.status} — rate limited`);
      return null;
    }
    if (res.status === 402) {
      console.warn(`[Firecrawl] HTTP ${res.status} — quota exceeded`);
      return null;
    }

    if (errLower.includes('quota') || errLower.includes('billing') || errLower.includes('exceeded')) {
      console.warn(`[Firecrawl] Quota error — ${json.error ?? json.code ?? 'quota'}`);
      return null;
    }
    if (errLower.includes('rate limit') || errLower.includes('too many requests')) {
      console.warn(`[Firecrawl] Rate limit — ${json.error ?? json.code ?? 'rate limit'}`);
      return null;
    }

    if (!res.ok) {
      console.warn('[Firecrawl] Scrape failed', url, res.status, json.error ?? json.code ?? 'unknown');
      return null;
    }

    if (json.success && markdown && markdown.length > 100) {
      return { text: markdown.slice(0, 28000) };
    }

    if (!markdown || markdown.length <= 100) {
      console.warn('[Firecrawl] Scrape returned insufficient content', url, markdown?.length ?? 0);
    }
    return null;
  } catch (e) {
    console.error('[Firecrawl] Scrape error', url, e instanceof Error ? e.message : e);
    return null;
  }
}

// ────────────────────────────────────────────────────────────
// Main Entry Point
// ────────────────────────────────────────────────────────────

export async function importJobsFromUrl(url: string): Promise<ATSParseResult> {
  const detected = detectProvider(url);

  if (detected) {
    // Tier 1: Use API if available
    switch (detected.provider) {
      case 'greenhouse':
        return fetchGreenhouseJobs(detected.company, detected.jobId);
      case 'lever':
        return fetchLeverJobs(detected.company, detected.jobId);
      case 'ashby':
        return fetchAshbyJobs(detected.company, detected.jobId);
    }

    // Tier 3: Known JS-rendered providers — try Firecrawl first
    if (JS_RENDERED_PROVIDERS.includes(detected.provider)) {
      // Try plain fetch for single job pages (sometimes SSR)
      if (!detected.isJobList && detected.jobId) {
        const page = await fetchGenericPage(url);
        if (page && !page.isJSRendered && page.text.length > 200) {
          return {
            provider: detected.provider,
            jobs: [],
            errors: [],
            rawText: page.text,
          };
        }
      }

      // Try Firecrawl for JS-rendered pages (waitFor helps Rippling/Workday load)
      const waitFor = getImportWaitForMs(url);
      const firecrawlResult = await fetchWithFirecrawl(url, { waitFor });
      if (firecrawlResult && firecrawlResult.text.length > 200) {
        return {
          provider: `${detected.provider}+firecrawl`,
          jobs: [],
          errors: [],
          rawText: firecrawlResult.text,
        };
      }

      const guidance = getJSRenderedGuidance(detected.provider);
      const hint = !isFirecrawlConfigured()
        ? ' Automatic page reading is not enabled here — paste job text or use direct job links.'
        : '';
      return {
        provider: detected.provider,
        jobs: [],
        errors: [guidance + hint],
      };
    }
  }

  // Tier 2: Generic HTML fetch
  const page = await fetchGenericPage(url);
  if (page && !page.isJSRendered && page.text.length > 200) {
    return {
      provider: 'generic',
      jobs: [],
      errors: [],
      rawText: page.text,
    };
  }

  // Tier 3 fallback: Try Firecrawl for any JS-rendered or failed page
  const firecrawlResult = await fetchWithFirecrawl(url, { waitFor: 2000 });
  if (firecrawlResult && firecrawlResult.text.length > 200) {
    return {
      provider: 'firecrawl',
      jobs: [],
      errors: [],
      rawText: firecrawlResult.text,
    };
  }

  if (page?.isJSRendered) {
    return {
      provider: 'generic',
      jobs: [],
      errors: [
        isFirecrawlConfigured()
          ? 'This careers page needs our page reader, and it did not return usable text (try again in a minute, paste the listings, or use direct job URLs).'
          : 'This careers page loads heavily in the browser. Paste the job text or individual job links — or ask your admin to enable automatic page reading for imports.',
      ],
    };
  }

  return {
    provider: 'generic',
    jobs: [],
    errors: ['Could not fetch this URL. Check the link or paste the job description text.'],
  };
}

/**
 * Fetch page text using best available method (generic fetch → Firecrawl fallback).
 * Returns cleaned text for AI parsing, or null with a reason if content is unusable.
 * @param waitFor - ms to wait for JS rendering (Rippling, Workday, etc.)
 */
export async function fetchPageText(
  url: string,
  options?: { waitFor?: number }
): Promise<{ text: string; source: 'direct' | 'firecrawl' } | FetchPageError> {
  // Try direct fetch first
  const page = await fetchGenericPage(url);

  if (page && !page.isJSRendered) {
    const quality = checkContentQuality(page.text);
    if (quality.isUsable) {
      return { text: page.text, source: 'direct' };
    }
    // Content is junk but we have it - log and continue to Firecrawl
    console.warn('[fetchPageText] Direct fetch returned low-quality content:', quality.reason);
  }

  // Try Firecrawl for JS-rendered pages or low-quality direct fetch
  const firecrawlResult = await fetchWithFirecrawl(url, { waitFor: options?.waitFor ?? getImportWaitForMs(url) });

  if (firecrawlResult) {
    const quality = checkContentQuality(firecrawlResult.text);
    if (quality.isUsable) {
      return { text: firecrawlResult.text, source: 'firecrawl' };
    }
    // Firecrawl returned content but it's not usable
    console.warn('[fetchPageText] Firecrawl returned low-quality content:', quality.reason);
    return { error: 'fetch_failed' };
  }

  // Firecrawl returned null — failed for other reasons (not configured, network error, etc.)
  return { error: 'fetch_failed' };
}

/**
 * Fetch sub-job page text with minimal Firecrawl usage.
 * Pattern: direct fetch first (free), Firecrawl only as last resort (saves credits).
 * Use this for per-job URLs discovered from a careers page — the top-level page
 * should have already used Firecrawl for discovery.
 */
export async function fetchSubJobPageText(
  url: string,
  options?: { waitFor?: number }
): Promise<{ text: string; source: 'direct' | 'firecrawl' } | FetchPageError> {
  // 1. Try direct fetch — many ATS job detail pages are server-rendered
  const page = await fetchGenericPage(url);
  if (page && !page.isJSRendered) {
    const quality = checkContentQuality(page.text);
    if (quality.isUsable) {
      return { text: page.text, source: 'direct' };
    }
  }

  // 2. Direct fetch failed or insufficient (JS-rendered, blocked) — Firecrawl as last resort
  const firecrawlResult = await fetchWithFirecrawl(url, { waitFor: options?.waitFor ?? getImportWaitForMs(url) });

  if (firecrawlResult) {
    const quality = checkContentQuality(firecrawlResult.text);
    if (quality.isUsable) {
      return { text: firecrawlResult.text, source: 'firecrawl' };
    }
    return { error: 'fetch_failed' };
  }

  // Firecrawl returned null — failed for other reasons (not configured, network error, etc.)
  return { error: 'fetch_failed' };
}

/**
 * Smart import: detects ATS provider, uses API when available, falls back to HTML/Firecrawl parsing.
 * Returns structured jobs ready for draft creation.
 */
export async function smartImportJobs(url: string): Promise<ATSParseResult> {
  const result = await importJobsFromUrl(url);

  // If we got jobs from API, return them
  if (result.jobs.length > 0) {
    return result;
  }

  // If errors (JS-rendered, fetch failed), return errors for user
  if (result.errors.length > 0) {
    return result;
  }

  // Tier 2/3 success but no structured jobs — return for AI parsing
  // Caller should use parseJobListingsFromPageText on the fetched text
  return result;
}
