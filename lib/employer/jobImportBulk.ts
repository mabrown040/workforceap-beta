import {
  buildFallbackParsedJobFromScrape,
  extractSubJobUrlsFromPageText,
  normalizeImportedParsedJob,
  parseJobFromText,
  parseJobListingsFromPageText,
  stripUrlsFromDescription,
  type ParsedJob,
  type ParsedJobListing,
} from '@/lib/ai/parseJob';
import { fetchSubJobPageText, getImportWaitForMs } from '@/lib/ai/atsProviders';
import { isAIConfigured } from '@/lib/ai/groq';

export type ImportedDraftInput = {
  title: string;
  description: string;
  sourceUrl: string;
  provider: string;
  location?: string;
  locationType?: 'remote' | 'hybrid' | 'onsite';
  jobType?: 'fulltime' | 'parttime' | 'contract';
  salaryMin?: number;
  salaryMax?: number;
  requirements?: string[];
  preferredCertifications?: string[];
  suggestedPrograms?: string[];
};

export type ImportedDraftError = {
  source: string;
  error: string;
};

type CollectDraftInputsDeps = {
  extractSubJobUrlsFromPageText?: typeof extractSubJobUrlsFromPageText;
  fetchSubJobPageText?: typeof fetchSubJobPageText;
  getImportWaitForMs?: typeof getImportWaitForMs;
  parseJobFromText?: typeof parseJobFromText;
  parseJobListingsFromPageText?: typeof parseJobListingsFromPageText;
  buildFallbackParsedJobFromScrape?: typeof buildFallbackParsedJobFromScrape;
  isAIConfigured?: typeof isAIConfigured;
};

export function appendImportedFrom(description: string, sourceUrl?: string): string {
  return sourceUrl ? `${description}\n\n---\nImported from: ${sourceUrl}` : description;
}

function buildDraftInputFromParsedJob(
  extracted: ParsedJob,
  sourceUrl: string,
  provider: string
): ImportedDraftInput {
  const normalized = normalizeImportedParsedJob(extracted);
  return {
    title: normalized.title,
    location: normalized.location,
    locationType: normalized.locationType ?? 'onsite',
    jobType: normalized.jobType ?? 'fulltime',
    salaryMin: normalized.salaryMin,
    salaryMax: normalized.salaryMax,
    description: appendImportedFrom(normalized.description, sourceUrl),
    requirements: normalized.requirements ?? [],
    preferredCertifications: normalized.preferredCertifications ?? [],
    suggestedPrograms: normalized.suggestedPrograms ?? [],
    sourceUrl,
    provider,
  };
}

function buildDraftInputFromListing(
  listing: ParsedJobListing,
  sourceUrl: string,
  provider = 'listing-fallback'
): ImportedDraftInput {
  const cleanDesc = stripUrlsFromDescription(listing.description.trim());
  return {
    title: listing.title.trim(),
    location: listing.location,
    description: cleanDesc ? appendImportedFrom(cleanDesc, sourceUrl) : appendImportedFrom('Imported listing.', sourceUrl),
    requirements: [],
    preferredCertifications: [],
    suggestedPrograms: [],
    sourceUrl,
    provider,
  };
}

export async function collectDraftInputsFromPageText(
  rawText: string,
  options?: {
    baseUrl?: string;
    deps?: CollectDraftInputsDeps;
  }
): Promise<{ handled: boolean; drafts: ImportedDraftInput[]; errors: ImportedDraftError[] }> {
  const deps = options?.deps;
  const extractSubUrls = deps?.extractSubJobUrlsFromPageText ?? extractSubJobUrlsFromPageText;
  const fetchSubPageText = deps?.fetchSubJobPageText ?? fetchSubJobPageText;
  const getWaitForMs = deps?.getImportWaitForMs ?? getImportWaitForMs;
  const parseSingleJob = deps?.parseJobFromText ?? parseJobFromText;
  const parseListings = deps?.parseJobListingsFromPageText ?? parseJobListingsFromPageText;
  const buildFallback = deps?.buildFallbackParsedJobFromScrape ?? buildFallbackParsedJobFromScrape;
  const aiConfigured = deps?.isAIConfigured ?? isAIConfigured;

  const drafts: ImportedDraftInput[] = [];
  const errors: ImportedDraftError[] = [];
  const listingFallbacks = (await parseListings(rawText)) ?? [];
  const subUrls = extractSubUrls(rawText, { baseUrl: options?.baseUrl });

  if (subUrls.length === 0 && listingFallbacks.length === 0) {
    return { handled: false, drafts, errors };
  }

  const listingFallbackByUrl = new Map(
    listingFallbacks
      .filter((listing) => listing.sourceUrl)
      .map((listing) => [listing.sourceUrl as string, listing])
  );

  if (subUrls.length > 0) {
    for (const { url, title: listingTitle } of subUrls) {
      const listingFallback = listingFallbackByUrl.get(url);
      const textForParse = (await fetchSubPageText(url, { waitFor: getWaitForMs(url) }))?.trim() ?? '';
      const parsedJob = textForParse.length >= 50 ? await parseSingleJob(textForParse) : null;
      const extractedRaw = textForParse ? (parsedJob ?? buildFallback(listingTitle, textForParse)) : null;

      if (extractedRaw) {
        drafts.push(buildDraftInputFromParsedJob(
          extractedRaw,
          url,
          parsedJob ? 'ai+per-job' : 'scrape+fallback'
        ));
        continue;
      }

      if (listingFallback) {
        drafts.push(buildDraftInputFromListing(listingFallback, url));
        continue;
      }

      if (!textForParse) {
        errors.push({ source: url, error: 'Could not fetch job page.' });
        continue;
      }

      errors.push({
        source: url,
        error: !aiConfigured()
          ? 'Job parse requires GROQ_API_KEY to be configured on the server.'
          : 'Could not parse job posting. Check server logs for [parseJobFromText].',
      });
    }

    return { handled: true, drafts, errors };
  }

  for (const listing of listingFallbacks) {
    drafts.push(buildDraftInputFromListing(
      listing,
      listing.sourceUrl ?? options?.baseUrl ?? '',
      'ai'
    ));
  }

  return { handled: true, drafts, errors };
}
