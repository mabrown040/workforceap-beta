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
}

/** Markdown [Title](url) - capture groups: 1=title, 2=url */
const MARKDOWN_LINK = /\[([^\]]{3,100})\]\((https?:\/\/[^\s)]+\/jobs\/[^\s)]+)\)/g;
/** Plain job URLs (single group) */
const PLAIN_JOB_URLS = [
  /(https?:\/\/[^\s]+ats\.rippling\.com[^\s]*\/jobs\/[a-zA-Z0-9_-]+)/g,
  /(https?:\/\/[^\s]+\.greenhouse\.io[^\s]*\/jobs\/\d+)/g,
  /(https?:\/\/[^\s]+jobs\.lever\.co[^\s]*\/[a-f0-9-]+)/g,
  /(https?:\/\/[^\s]+jobs\.ashbyhq\.com[^\s]*\/[a-f0-9-]+)/g,
  /(https?:\/\/[^\s]+\/jobs\/[a-zA-Z0-9_-]+)/g,
];

/**
 * Extract sub-job URLs from careers page text. Used to follow each URL and parse
 * the actual job posting for clean draft cards (no raw URL text in body).
 */
export function extractSubJobUrlsFromPageText(rawText: string): { url: string; title?: string }[] {
  const seen = new Set<string>();
  const results: { url: string; title?: string }[] = [];

  let match;
  while ((match = MARKDOWN_LINK.exec(rawText)) !== null) {
    const title = match[1].trim();
    const url = match[2].trim();
    if (seen.has(url)) continue;
    if (/^(view|apply|see|terms|privacy|cookie|powered)/i.test(title)) continue;
    seen.add(url);
    results.push({ url, title });
  }

  for (const regex of PLAIN_JOB_URLS) {
    regex.lastIndex = 0;
    while ((match = regex.exec(rawText)) !== null) {
      const url = match[1].trim();
      if (!seen.has(url)) {
        seen.add(url);
        results.push({ url });
      }
    }
  }

  return results.slice(0, 12);
}

/** Remove raw URL strings from text to avoid leaking into card body */
export function stripUrlsFromDescription(text: string): string {
  return text
    .replace(/\bhttps?:\/\/[^\s]+/g, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Try to extract jobs from structured markdown (ATS career pages typically have
 * [Title](url) patterns). Falls back to AI parsing if no structured data found.
 */
function extractJobsFromMarkdown(rawText: string): ParsedJobListing[] | null {
  // Match markdown links: [Job Title](url)
  const linkPattern = /\[([^\]]{3,100})\]\((https?:\/\/[^\s)]+\/jobs\/[^\s)]+)\)/g;
  const seen = new Set<string>();
  const jobs: ParsedJobListing[] = [];

  let match;
  while ((match = linkPattern.exec(rawText)) !== null) {
    const title = match[1].trim();
    const url = match[2].trim();

    // Skip generic links like "View job", "Apply", "Terms"
    if (/^(view|apply|see|terms|privacy|cookie|powered)/i.test(title)) continue;
    // Skip duplicates
    if (seen.has(url)) continue;
    seen.add(url);

    // Try to find department/location near this link
    const afterLink = rawText.slice(match.index + match[0].length, match.index + match[0].length + 200);
    const lines = afterLink.split('\n').map(l => l.trim()).filter(Boolean);
    const department = lines[0] && lines[0].length < 60 && !lines[0].startsWith('[') && !lines[0].startsWith('#') ? lines[0] : undefined;
    const location = lines[1] && lines[1].length < 60 && !lines[1].startsWith('[') && !lines[1].startsWith('#') ? lines[1] : undefined;

    const descParts = [title];
    if (department) descParts.push(`Department: ${department}`);
    if (location) descParts.push(`Location: ${location}`);
    descParts.push('Details to be added — imported from careers page.');

    jobs.push({
      title,
      description: descParts.join('\n'),
      sourceUrl: url,
    });
  }

  return jobs.length > 0 ? jobs.slice(0, 25) : null;
}

/** Keep prompts within model context: for noisy ATS pages, include start + end so the real JD isn't only in the tail. */
export function clipJobSourceTextForLLM(rawText: string, maxChars = 26000): string {
  const t = rawText.trim();
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
  const lines = rawText.split('\n').map((l) => l.trim());
  const skip = /^(rippling|careers|jobs at|open positions|home|menu|skip to|cookie|privacy|apply|log ?in|sign ?in)/i;
  for (let i = 0; i < Math.min(lines.length, 100); i++) {
    const line = lines[i];
    if (!line) continue;
    const hm = line.match(/^#{1,2}\s+(.+)$/);
    if (hm) {
      const title = hm[1].replace(/\*+/g, '').trim();
      if (title.length < 3 || title.length > 140) continue;
      if (skip.test(title)) continue;
      return title;
    }
  }
  return null;
}

const FALLBACK_NOTE =
  '\n\n---\nNote: Structured AI parse did not return a clean result — this draft was built from the scraped page text. Please edit title, location, and description before submitting.';

/** Last-resort draft when Groq JSON parse fails but we have a title hint and enough body text. */
export function buildFallbackParsedJobFromScrape(
  listingTitle: string | undefined,
  pageText: string
): ParsedJob | null {
  const title =
    listingTitle && listingTitle.trim().length >= 3
      ? listingTitle.trim()
      : extractLikelyJobTitleFromScrape(pageText);
  if (!title) return null;
  let body = stripUrlsFromDescription(pageText).trim();
  if (body.length < 50) return null;
  const maxBody = 85_000;
  if (body.length > maxBody) {
    const half = Math.floor(maxBody / 2) - 80;
    body = `${body.slice(0, half)}\n\n[... trimmed for length ...]\n\n${body.slice(-half)}`;
  }
  return {
    title,
    description: `${body}${FALLBACK_NOTE}`,
    requirements: [],
    preferredCertifications: [],
    suggestedPrograms: [],
  };
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
- If the page only lists titles with links and no body text, use title + "Details to be added — imported from careers page." as description.
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
Long pages often begin with navigation, cookie banners, or repeated site chrome — find the real role title and the responsibilities/qualifications sections.
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
    return parsed;
  } catch (err) {
    console.error('[parseJobFromText] failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
