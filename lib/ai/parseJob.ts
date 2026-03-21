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

/**
 * Extract multiple job postings from careers-page HTML (plain text) or pasted listings.
 * Used for bulk draft creation in the employer portal.
 */
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
- If the page only lists titles with links and no body text, use title + "Details to be added — imported from careers page." as description.
- Cap at 25 jobs; prefer the most recently listed or most prominent if there are more.
- Omit non-job content (navigation, footers).`;

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
  if (!isAIConfigured()) return null;

  const programSlugs = PROGRAMS.map((p) => p.slug).join(', ');

  const systemPrompt = `You are a job posting parser. Extract structured job data from unstructured text (e.g. LinkedIn, Indeed, company career pages).
Output valid JSON only, no markdown. Use this exact schema:
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
Infer locationType from words like "remote", "hybrid", "on-site". Infer jobType from "full-time", "part-time", "contract".`;

  const userPrompt = `Parse this job posting:\n\n${rawText.slice(0, 12000)}`;

  try {
    const output = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 2000, temperature: 0.2 }
    );
    if (!output) return null;

    const cleaned = output.replace(/^```json?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned) as ParsedJob;
    if (!parsed.title || !parsed.description) return null;
    return parsed;
  } catch {
    return null;
  }
}
