import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { PROGRAMS } from '@/lib/content/programs';

export interface ParsedJob {
  title: string;
  company?: string;
  location?: string;
  locationType?: 'remote' | 'hybrid' | 'onsite';
  jobType?: 'fulltime' | 'parttime' | 'contract';
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  requirements?: string[];
  preferredCertifications?: string[];
  suggestedPrograms?: string[];
}

export interface ParsedJobListing {
  title: string;
  /** Enough text to edit later; can be a summary if the page only had snippets */
  description: string;
  /** Job detail URL if found in the page */
  sourceUrl?: string;
  /** Best-effort location extracted near the listing */
  location?: string;
}

type JobLinkCandidate = { url: string; title?: string; index: number };

/** Markdown [Title](url) - capture groups: 1=title, 2=url */
const MARKDOWN_LINK = /\[([^\]]{3,160})\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g;
const PLAIN_URL = /(https?:\/\/[^\s<>)\]]+)/g;
const NOISE_LINK_TITLE = /^(view|apply|see|terms|privacy|cookie|powered|learn more|read more|details?)$/i;
const NOISE_LINK_URL = /\/(?:apply|privacy|cookies?|terms|login|signin|sign-in)(?:[/?#]|$)/i;
const JOB_DETAIL_URL_HINT =
  /(?:\/jobs?\/(?!$)|\/job\/|\/job-posting\/|\/positions?\/|\/openings?\/|\/careers\/[^/?#]+\/jobs?\/|[?&](?:job|jobid|job_id|gh_jid|lever-via|ashby_jid|postingId|reqid)=|ats\.rippling\.com\/(?:en-[^/]+\/)?[^/]+\/jobs\/[^/?#]+|jobs\.lever\.co\/[^/]+\/[a-f0-9-]+|boards\.greenhouse\.io\/[^/]+\/jobs\/\d+|jobs\.ashbyhq\.com\/[^/]+\/[a-z0-9-]+)/i;
const JOB_TITLE_HINT =
  /\b(engineer|developer|manager|director|analyst|designer|specialist|associate|representative|coordinator|architect|administrator|recruiter|consultant|intern|officer|lead|head|principal|scientist|product|success|marketing|sales|support|operations|finance|account|nurse|therapist|teacher)\b/i;
const PORTAL_CHROME_LINE =
  /^(?:employer portal|site home|sign out|viewing as(?:\s+.+)?|switch company|job postings|applicants|create posting|almost ready to send|review and send|send test|publish job|posting settings|candidate pipeline|interview kits?|reports|settings|dashboard|back to jobs|back to job postings|all jobs|manage postings|review posting|preview posting|posting preview|job board|company settings|team settings|billing|integrations|workflow automations?|approval flows?|candidate details|application review|review application|review job|edit posting|edit job|post job|new posting)$/i;
const NOISE_BODY_LINE =
  /^(?:draft|needs a few details|job description\s*\*?|location \(city, state or remote\)|share this job|copy link|back to jobs|apply now|save job|imported with|read more|show more|employer portal|site home|sign out|viewing as(?:\s+.+)?|switch company|job postings|applicants|create posting|almost ready to send|submit for review)$/i;

function cleanScrapedJobLine(line: string, options?: { preserveMarkdownHeadings?: boolean }): string {
  const leadingPattern = options?.preserveMarkdownHeadings ? /^[>*\-\s]+/ : /^[#>*\-\s]+/;
  return cleanWhitespace(line)
    .replace(leadingPattern, '')
    .replace(/[|:•·]+$/g, '')
    .trim();
}

function isPortalChromeLine(line: string): boolean {
  const cleaned = cleanScrapedJobLine(line);
  if (!cleaned) return false;
  return PORTAL_CHROME_LINE.test(cleaned) || NOISE_BODY_LINE.test(cleaned);
}

function cleanWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function shouldSkipImportedTitle(title: string): boolean {
  const cleaned = cleanWhitespace(title).replace(/^#{1,6}\s+/, '').trim();
  if (!cleaned) return true;
  if (isPortalChromeLine(cleaned)) return true;
  return /^(?:rippling|careers|jobs at|open positions|home|menu|skip to|cookie|privacy|apply|log ?in|sign ?in|back to jobs)$/i.test(cleaned);
}

export function normalizeCandidateUrl(rawUrl: string, baseUrl?: string): string | null {
  const trimmed = rawUrl.trim().replace(/[),.;:]+$/g, '');
  try {
    const resolved = new URL(trimmed, baseUrl);
    resolved.hash = '';
    for (const key of [...resolved.searchParams.keys()]) {
      if (/^(utm_|gh_src|gh_jid_source|fbclid|gclid|source|ref)$/i.test(key)) {
        resolved.searchParams.delete(key);
      }
    }
    return resolved.toString();
  } catch {
    return null;
  }
}

function looksLikeJobDetailUrl(url: string, title?: string): boolean {
  if (NOISE_LINK_URL.test(url)) return false;
  if (title && NOISE_LINK_TITLE.test(cleanWhitespace(title))) return false;
  return JOB_DETAIL_URL_HINT.test(url) || Boolean(title && JOB_TITLE_HINT.test(title));
}

function extractJobLinkCandidates(rawText: string, baseUrl?: string): JobLinkCandidate[] {
  const seen = new Set<string>();
  const results: JobLinkCandidate[] = [];

  let match: RegExpExecArray | null;
  while ((match = MARKDOWN_LINK.exec(rawText)) !== null) {
    const title = cleanWhitespace(match[1] ?? '');
    const url = normalizeCandidateUrl(match[2] ?? '', baseUrl);
    if (!url || seen.has(url) || !looksLikeJobDetailUrl(url, title)) continue;
    seen.add(url);
    results.push({ url, title, index: match.index });
  }

  while ((match = PLAIN_URL.exec(rawText)) !== null) {
    const url = normalizeCandidateUrl(match[1] ?? '', baseUrl);
    if (!url || seen.has(url) || !looksLikeJobDetailUrl(url)) continue;
    seen.add(url);
    results.push({ url, index: match.index });
  }

  return results.sort((a, b) => a.index - b.index);
}

function collectContextLines(rawText: string, startIndex: number, maxLines = 4): string[] {
  const after = rawText.slice(startIndex).split('\n');
  const lines: string[] = [];
  for (const line of after) {
    const cleaned = cleanScrapedJobLine(line);
    if (!cleaned) continue;
    if (cleaned.startsWith('[') || cleaned.startsWith('#')) continue;
    if (/^https?:\/\//i.test(cleaned)) continue;
    if (isPortalChromeLine(cleaned)) continue;
    lines.push(cleaned);
    if (lines.length >= maxLines) break;
  }
  return lines;
}

/**
 * Extract sub-job URLs from careers page text. Used to follow each URL and parse
 * the actual job posting for clean draft cards (no raw URL text in body).
 */
export function extractSubJobUrlsFromPageText(
  rawText: string,
  options?: { baseUrl?: string; limit?: number }
): { url: string; title?: string }[] {
  return extractJobLinkCandidates(rawText, options?.baseUrl)
    .slice(0, options?.limit ?? 25)
    .map(({ url, title }) => ({ url, title }));
}

function looksLikeCssNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  const braceCount = (trimmed.match(/\{/g) ?? []).length;
  const semicolonCount = (trimmed.match(/;/g) ?? []).length;
  if (trimmed.length > 2000 && (braceCount >= 3 || semicolonCount >= 8)) return true;

  if (/^(?:@font-face|:root\s*\{|body\s*\{|html\s*\{|main\s*\{|div\s*\{|span\s*\{|ul\s*\{|ol\s*\{|li\s*\{|p(?:,|\s*\{)|h[1-6](?:,|\s*\{)|\.\w[-\w]*\s*\{|#\w[-\w]*\s*\{)/i.test(trimmed)) {
    return true;
  }

  return /(?:--[a-z0-9-]+\s*:|font-family\s*:|src:\s*url\(|format\(|-webkit-|-moz-|rgba?\(|#[0-9a-f]{3,8}\b)/i.test(trimmed)
    && /[{};]/.test(trimmed);
}

export function sanitizeScrapedJobText(rawText: string): string {
  let cleaned = rawText
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/@font-face\s*\{[\s\S]{0,4000}?\}/gi, ' ')
    .replace(/:root\s*\{[\s\S]{0,20000}?\}/gi, ' ')
    .replace(/(?:^|\n)\s*(?:body|html|main|div|span|ul|ol|li|p|h[1-6]|\.truncate|\.lineClamp(?:--inline)?)\s*\{[^\n]*\}/gi, '\n');

  const lines = cleaned
    .split('\n')
    .map((line) => cleanScrapedJobLine(line, { preserveMarkdownHeadings: true }))
    .filter((line) => !looksLikeCssNoiseLine(line))
    .filter((line) => !isPortalChromeLine(line));

  cleaned = lines.join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return cleaned;
}

/** Remove raw URL strings from text to avoid leaking into card body */
export function stripUrlsFromDescription(text: string): string {
  return text
    .replace(/\bhttps?:\/\/[^\s]+/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

function cleanStringList(values?: string[]): string[] | undefined {
  if (!values?.length) return undefined;
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const value of values) {
    const normalized = cleanWhitespace(value ?? '');
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(normalized);
  }
  return cleaned.length > 0 ? cleaned : undefined;
}

export function normalizeImportedParsedJob(job: ParsedJob): ParsedJob {
  return {
    ...job,
    title: cleanWhitespace(job.title),
    company: job.company ? cleanWhitespace(job.company) : undefined,
    location: job.location ? cleanWhitespace(job.location) : undefined,
    description: stripUrlsFromDescription(job.description).replace(/\n{3,}/g, '\n\n').trim(),
    requirements: cleanStringList(job.requirements),
    preferredCertifications: cleanStringList(job.preferredCertifications),
    suggestedPrograms: cleanStringList(job.suggestedPrograms),
  };
}

/**
 * Try to extract jobs from structured markdown (ATS career pages typically have
 * [Title](url) patterns). Falls back to AI parsing if no structured data found.
 */
function extractJobsFromMarkdown(rawText: string): ParsedJobListing[] | null {
  const jobs: ParsedJobListing[] = [];

  for (const candidate of extractJobLinkCandidates(rawText)) {
    if (!candidate.title) continue;
    const lines = collectContextLines(rawText, candidate.index, 4);
    const department = lines[0] && lines[0].length < 80 ? lines[0] : undefined;
    const location = lines.find((line) =>
      /(?:remote|hybrid|[A-Za-z .'-]+,\s*[A-Z]{2}|[A-Za-z .'-]+,\s*[A-Za-z .'-]+|united states|usa)/i.test(line)
    );

    const descParts = [candidate.title];
    if (department && department !== candidate.title) descParts.push(`Department: ${department}`);
    if (location) descParts.push(`Location: ${location}`);
    descParts.push('Details to be added - imported from careers page.');

    jobs.push({
      title: candidate.title,
      description: descParts.join('\n'),
      sourceUrl: candidate.url,
      location,
    });
  }

  return jobs.length > 0 ? jobs.slice(0, 25) : null;
}

/** Keep prompts within model context: for noisy ATS pages, include start + end so the real JD isn't only in the tail. */
export function clipJobSourceTextForLLM(rawText: string, maxChars = 26000): string {
  const t = sanitizeScrapedJobText(rawText).trim();
  if (t.length <= maxChars) return t;
  const budget = maxChars - 120;
  const head = Math.floor(budget / 2);
  const tail = budget - head;
  return `${t.slice(0, head)}\n\n[... middle of page omitted ...]\n\n${t.slice(-tail)}`;
}

/**
 * When AI parse fails, try the first markdown H1/H2 that looks like a role title (not nav chrome).
 */
export function extractLikelyJobTitleFromScrape(rawText: string): string | null {
  const lines = sanitizeScrapedJobText(rawText)
    .split('\n')
    .map((line) => cleanScrapedJobLine(line, { preserveMarkdownHeadings: true }));
  const skip = /^(rippling|careers|jobs at|open positions|home|menu|skip to|cookie|privacy|apply|log ?in|sign ?in|employer portal|site home|viewing as|switch company|job postings|applicants|create posting|almost ready to send|submit for review|back to jobs)/i;
  for (let i = 0; i < Math.min(lines.length, 100); i++) {
    const line = lines[i];
    if (!line) continue;
    const hm = line.match(/^#{1,2}\s+(.+)$/);
    if (hm) {
      const title = hm[1].replace(/\*+/g, '').trim();
      if (title.length < 3 || title.length > 140) continue;
      if (skip.test(title)) continue;
      if (shouldSkipImportedTitle(title)) continue;
      return title;
    }
  }
  return null;
}

const FALLBACK_NOTE =
  '\n\n---\nNote: Structured AI parse did not return a clean result - this draft was built from the scraped page text. Please edit title, location, and description before submitting.';

/** Last-resort draft when Groq JSON parse fails but we have a title hint and enough body text. */
export function buildFallbackParsedJobFromScrape(
  listingTitle: string | undefined,
  pageText: string
): ParsedJob | null {
  const cleanedListingTitle = listingTitle?.trim();
  const title =
    cleanedListingTitle && cleanedListingTitle.length >= 3 && !shouldSkipImportedTitle(cleanedListingTitle)
      ? cleanedListingTitle
      : extractLikelyJobTitleFromScrape(pageText);
  if (!title) return null;
  let body = stripUrlsFromDescription(sanitizeScrapedJobText(pageText)).trim();
  if (body.length < 50) return null;
  const maxBody = 85_000;
  if (body.length > maxBody) {
    const half = Math.floor(maxBody / 2) - 80;
    body = `${body.slice(0, half)}\n\n[... trimmed for length ...]\n\n${body.slice(-half)}`;
  }
  return normalizeImportedParsedJob({
    title,
    description: `${body}${FALLBACK_NOTE}`,
    requirements: [],
    preferredCertifications: [],
    suggestedPrograms: [],
  });
}

export async function parseJobListingsFromPageText(rawText: string): Promise<ParsedJobListing[] | null> {
  // Try structured markdown extraction first (fast, no AI credits)
  const markdownJobs = extractJobsFromMarkdown(rawText);
  if (markdownJobs && markdownJobs.length > 0) return markdownJobs;

  if (!isAIConfigured()) return null;

  const systemPrompt = `You extract individual job openings from a careers page or job board index (plain text).
Output valid JSON only, no markdown. Schema:
{ "jobs": [ { "title": "string", "description": "string (full posting text if present; otherwise a clear summary + key requirements)", "sourceUrl": "string or null (absolute URL to this job if visible in the text)" } ] }
Rules:
- Each array item must be a distinct role (not duplicate titles).
- NEVER include raw URLs, link URLs, or placeholder URLs in the description. Use clean prose only.
- If the page only lists titles with links and no body text, use title + "Details to be added - imported from careers page." as description.
- Cap at 25 jobs; prefer the most recently listed or most prominent if there are more.
- Omit non-job content (navigation, footers). Put the URL in sourceUrl only, not in description.`;

  const userPrompt = `Extract job listings from this text:\n\n${rawText.slice(0, 24000)}`;

  try {
    const output = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 8000, temperature: 0.15 }
    );
    if (!output) return null;

    const cleaned = output.replace(/^```json?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned) as { jobs?: ParsedJobListing[] };
    const jobs = parsed.jobs?.filter((j) => j.title?.trim() && j.description?.trim()) ?? [];
    if (jobs.length === 0) return null;
    return jobs.slice(0, 25);
  } catch {
    return null;
  }
}

export async function parseJobFromText(rawText: string): Promise<ParsedJob | null> {
  if (!isAIConfigured()) {
    console.warn('[parseJobFromText] skipped: GROQ_API_KEY is not set');
    return null;
  }

  const programSlugs = PROGRAMS.map((p) => p.slug).join(', ');

  const systemPrompt = `You are a job posting parser. Extract structured job data from unstructured text (e.g. LinkedIn, Indeed, company career pages, ATS markdown).
Output valid JSON only, no markdown fences. Use this exact schema:
{
  "title": "string (job title)",
  "company": "string or null",
  "location": "string or null (city, state, or 'Remote')",
  "locationType": "remote" | "hybrid" | "onsite" or null,
  "jobType": "fulltime" | "parttime" | "contract" or null,
  "salaryMin": number or null (annual, whole dollars),
  "salaryMax": number or null (annual, whole dollars),
  "description": "string (full job description, preserve formatting)",
  "requirements": ["string"] (bullet list of requirements),
  "preferredCertifications": ["string"] (cert names if mentioned),
  "suggestedPrograms": ["slug"] (from: ${programSlugs} - pick slugs that best match job requirements)
}
Long pages often begin with navigation, cookie banners, or repeated site chrome - find the real role title and the responsibilities/qualifications sections.
Infer locationType from words like "remote", "hybrid", "on-site". Infer jobType from "full-time", "part-time", "contract".
Keep "description" complete but concise if the source is huge (under ~6000 characters of prose is OK).`;

  const userPrompt = `Parse this job posting:\n\n${clipJobSourceTextForLLM(rawText, 26000)}`;

  try {
    const output = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 8192, temperature: 0.15 }
    );
    if (!output) {
      console.warn('[parseJobFromText] empty model output (all models returned no content)');
      return null;
    }

    const cleaned = output.replace(/^```json?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    let parsed: ParsedJob;
    try {
      parsed = JSON.parse(cleaned) as ParsedJob;
    } catch (parseErr) {
      console.error(
        '[parseJobFromText] JSON.parse failed:',
        parseErr instanceof Error ? parseErr.message : parseErr
      );
      console.error('[parseJobFromText] model output (first 600 chars):', cleaned.slice(0, 600));
      return null;
    }
    if (!parsed.title || !parsed.description) {
      console.warn('[parseJobFromText] parsed object missing title or description');
      return null;
    }
    return normalizeImportedParsedJob(parsed);
  } catch (err) {
    console.error('[parseJobFromText] failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
