/**
 * ATS Provider Parsers
 * 
 * Tier 1: Public API integrations (Greenhouse, Lever, Ashby)
 * Tier 2: Server-rendered HTML parsing (BuiltIn, generic)
 * Tier 3: JS-rendered fallback detection with user guidance
 */

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
    const res = await fetch(url, {
      headers: { ...FETCH_HEADERS, 'Accept': 'text/html,application/xhtml+xml' },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Detect JS-rendered pages (minimal content in body)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyText = bodyMatch?.[1] ?? html;
    const stripped = stripHtml(bodyText);

    if (stripped.length < 200) {
      return { text: stripped, isJSRendered: true };
    }

    return { text: stripped.slice(0, 28000), isJSRendered: false };
  } catch {
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

async function fetchWithFirecrawl(url: string): Promise<{ text: string } | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;

  try {
    const FirecrawlModule = await import('@mendable/firecrawl-js');
    const Firecrawl = FirecrawlModule.default;
    const app = new Firecrawl({ apiKey });
    const result = await app.scrapeUrl(url, { formats: ['markdown'] });
    if (result.success && result.markdown && result.markdown.length > 100) {
      return { text: result.markdown.slice(0, 28000) };
    }
    return null;
  } catch {
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
            jobs: [], // Will be AI-parsed by caller
            errors: [],
          };
        }
      }

      // Try Firecrawl for JS-rendered pages
      const firecrawlResult = await fetchWithFirecrawl(url);
      if (firecrawlResult && firecrawlResult.text.length > 200) {
        return {
          provider: `${detected.provider}+firecrawl`,
          jobs: [], // Will be AI-parsed by caller with the markdown text
          errors: [],
        };
      }

      return {
        provider: detected.provider,
        jobs: [],
        errors: [getJSRenderedGuidance(detected.provider)],
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
    };
  }

  // Tier 3 fallback: Try Firecrawl for any JS-rendered or failed page
  const firecrawlResult = await fetchWithFirecrawl(url);
  if (firecrawlResult && firecrawlResult.text.length > 200) {
    return {
      provider: 'firecrawl',
      jobs: [], // Will be AI-parsed by caller
      errors: [],
    };
  }

  if (page?.isJSRendered) {
    return {
      provider: 'generic',
      jobs: [],
      errors: ['This career page uses JavaScript rendering. Firecrawl is not configured — add FIRECRAWL_API_KEY to enable JS page scraping, or paste individual job URLs.'],
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
 * Returns cleaned text for AI parsing.
 */
export async function fetchPageText(url: string): Promise<string | null> {
  // Try generic fetch first
  const page = await fetchGenericPage(url);
  if (page && !page.isJSRendered && page.text.length > 200) {
    return page.text;
  }

  // Try Firecrawl for JS-rendered pages
  const firecrawlResult = await fetchWithFirecrawl(url);
  if (firecrawlResult && firecrawlResult.text.length > 200) {
    return firecrawlResult.text;
  }

  // Return whatever we got from generic (even if short)
  return page?.text ?? null;
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
