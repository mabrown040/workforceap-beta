import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import {
  parseJobFromText,
  parseJobListingsFromPageText,
  extractSubJobUrlsFromPageText,
  stripUrlsFromDescription,
  buildFallbackParsedJobFromScrape,
} from '@/lib/ai/parseJob';
import { smartImportJobs, fetchSubJobPageText } from '@/lib/ai/atsProviders';
import { isAIConfigured } from '@/lib/ai/groq';
import { buildEmployerJobCreateData, getRouteErrorDetails } from '@/lib/employer/jobCreate';
import { checkEmployerJobImportRateLimit } from '@/lib/rate-limit';

const bulkSchema = z
  .object({
    jobUrls: z.array(z.string().url()).max(15).optional(),
    careersPageUrl: z.string().url().optional(),
    careersPageRawText: z.string().min(80).max(200_000).optional(),
  })
  .refine((d) => (d.jobUrls?.length ?? 0) > 0 || d.careersPageUrl || d.careersPageRawText, {
    message: 'Provide jobUrls, careersPageUrl, or careersPageRawText',
  });

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 28000);
}

async function fetchTextFromUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WorkforceAP/1.0)' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const text = stripHtmlToText(html);
    return text.length >= 80 ? text : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await getEmployerForUser(user.id);
    if (!ctx) return NextResponse.json({ error: 'Forbidden: employer access required' }, { status: 403 });

    const employerExists = await prisma.employer.findUnique({
      where: { id: ctx.employerId },
      select: { id: true },
    });
    if (!employerExists) {
      return NextResponse.json({ error: 'Selected employer record was not found.' }, { status: 400 });
    }

    const { success: importAllowed, remaining: importRemaining } = await checkEmployerJobImportRateLimit(user.id);
    if (!importAllowed) {
      return NextResponse.json(
        { error: 'Too many job import requests. Please wait up to an hour and try again.', remaining: importRemaining },
        { status: 429, headers: { 'Retry-After': '3600' } }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid body' }, { status: 400 });
    }

    const created: { id: string; title: string; provider?: string }[] = [];
    const errors: { source: string; error: string }[] = [];

    const { jobUrls, careersPageUrl, careersPageRawText } = parsed.data;

  // ── Process individual job URLs ──
  if (jobUrls?.length) {
    for (const url of jobUrls) {
      // Try smart ATS import first
      const atsResult = await smartImportJobs(url);

      if (atsResult.jobs.length > 0) {
        // ATS API returned structured jobs
        for (const atsJob of atsResult.jobs) {
          const suffix = atsJob.sourceUrl ? `\n\n---\nImported from: ${atsJob.sourceUrl}` : '';
          const job = await prisma.job.create({
            data: buildEmployerJobCreateData(ctx.employerId, {
              title: atsJob.title,
              location: atsJob.location,
              locationType: atsJob.locationType ?? 'onsite',
              jobType: atsJob.jobType ?? 'fulltime',
              salaryMin: atsJob.salaryMin,
              salaryMax: atsJob.salaryMax,
              description: `${atsJob.description}${suffix}`,
              requirements: atsJob.requirements ?? [],
              preferredCertifications: [],
              suggestedPrograms: [],
              status: 'draft',
            }),
          });
          created.push({ id: job.id, title: job.title, provider: atsResult.provider });
        }
        continue;
      }

      if (atsResult.errors.length > 0) {
        errors.push({ source: url, error: atsResult.errors[0] });
        continue;
      }

      // Same path as single-job import: prefer text already fetched by smartImportJobs
      let textForParse: string | null =
        atsResult.rawText && atsResult.rawText.length >= 50 ? atsResult.rawText : null;
      if (!textForParse) {
        textForParse = await fetchTextFromUrl(url);
      }
      if (!textForParse || textForParse.length < 50) {
        errors.push({
          source: url,
          error:
            atsResult.rawText != null && atsResult.rawText.length > 0 && atsResult.rawText.length < 50
              ? 'Fetched page text was too short to parse. Try pasting the full job description.'
              : 'Could not fetch or not enough text (try pasting the description).',
        });
        continue;
      }

      const parsed = await parseJobFromText(textForParse);
      const extracted = parsed ?? buildFallbackParsedJobFromScrape(undefined, textForParse);
      if (!extracted) {
        errors.push({
          source: url,
          error: !isAIConfigured()
            ? 'Job parse requires GROQ_API_KEY to be configured on the server.'
            : 'AI could not parse this posting. Check server logs for [parseJobFromText] details.',
        });
        continue;
      }
      const suffix = `\n\n---\nImported from: ${url}`;
      const job = await prisma.job.create({
        data: buildEmployerJobCreateData(ctx.employerId, {
          title: extracted.title,
          location: extracted.location,
          locationType: extracted.locationType ?? 'onsite',
          jobType: extracted.jobType ?? 'fulltime',
          salaryMin: extracted.salaryMin,
          salaryMax: extracted.salaryMax,
          description: `${extracted.description}${suffix}`,
          requirements: extracted.requirements ?? [],
          preferredCertifications: extracted.preferredCertifications ?? [],
          suggestedPrograms: extracted.suggestedPrograms ?? [],
          status: 'draft',
        }),
      });
      created.push({ id: job.id, title: job.title, provider: parsed ? 'ai' : 'scrape+fallback' });
    }
  }

  // ── Process careers page URL (smart ATS first) ──
  let listingsText = careersPageRawText?.trim() ?? '';
  let careersPageProcessed = false;

  if (careersPageUrl && !listingsText) {
    // Try smart ATS import for careers page
    const atsResult = await smartImportJobs(careersPageUrl);

    if (atsResult.jobs.length > 0) {
      // ATS API returned all jobs from careers page
      for (const atsJob of atsResult.jobs) {
        const suffix = atsJob.sourceUrl ? `\n\n---\nImported from: ${atsJob.sourceUrl}` : '';
        const job = await prisma.job.create({
          data: buildEmployerJobCreateData(ctx.employerId, {
            title: atsJob.title,
            location: atsJob.location,
            locationType: atsJob.locationType ?? 'onsite',
            jobType: atsJob.jobType ?? 'fulltime',
            salaryMin: atsJob.salaryMin,
            salaryMax: atsJob.salaryMax,
            description: `${atsJob.description}${suffix}`,
            requirements: atsJob.requirements ?? [],
            preferredCertifications: [],
            suggestedPrograms: [],
            status: 'draft',
          }),
        });
        created.push({ id: job.id, title: job.title, provider: atsResult.provider });
      }
      careersPageProcessed = true;
    } else if (atsResult.errors.length > 0) {
      errors.push({ source: careersPageUrl, error: atsResult.errors[0] });
      careersPageProcessed = true;
    } else if (atsResult.rawText && atsResult.rawText.length >= 80) {
      listingsText = atsResult.rawText;
    } else {
      errors.push({ source: careersPageUrl, error: 'Could not fetch careers page content. Paste the page text instead.' });
      careersPageProcessed = true;
    }
  }

  // ── Follow sub-job URLs (direct fetch first, Firecrawl only when blocked) ──
  // Top-level careers page already used Firecrawl for discovery. Sub-pages: prefer
  // regular fetch to save credits; Firecrawl fallback only if direct fetch fails.
  if (listingsText.length >= 80 && !careersPageProcessed) {
    const subUrls = extractSubJobUrlsFromPageText(listingsText);
    const listingFallbacks = (await parseJobListingsFromPageText(listingsText)) ?? [];
    const listingFallbackByUrl = new Map(
      listingFallbacks
        .filter((listing) => listing.sourceUrl)
        .map((listing) => [listing.sourceUrl as string, listing])
    );
    const isJsRenderedAts = careersPageUrl && /rippling|workday|icims/i.test(careersPageUrl);

    if (subUrls.length > 0) {
      for (const { url, title: listingTitle } of subUrls) {
        const listingFallback = listingFallbackByUrl.get(url);
        const pageText = await fetchSubJobPageText(url, { waitFor: isJsRenderedAts ? 4500 : 2000 });
        if (!pageText || pageText.length < 80) {
          if (listingFallback) {
            const cleanDesc = stripUrlsFromDescription(listingFallback.description.trim());
            const suffix = `

---
Imported from: ${url}`;
            const job = await prisma.job.create({
              data: buildEmployerJobCreateData(ctx.employerId, {
                title: listingFallback.title.trim(),
                description: cleanDesc ? `${cleanDesc}${suffix}` : `Imported listing.${suffix}`,
                requirements: [],
                preferredCertifications: [],
                suggestedPrograms: [],
                status: 'draft',
              }),
            });
            created.push({ id: job.id, title: job.title, provider: 'listing-fallback' });
            continue;
          }
          errors.push({ source: url, error: 'Could not fetch job page.' });
          continue;
        }
        const parsed = await parseJobFromText(pageText);
        const extracted = parsed ?? buildFallbackParsedJobFromScrape(listingTitle, pageText);
        if (!extracted) {
          if (listingFallback) {
            const cleanDesc = stripUrlsFromDescription(listingFallback.description.trim());
            const suffix = `

---
Imported from: ${url}`;
            const job = await prisma.job.create({
              data: buildEmployerJobCreateData(ctx.employerId, {
                title: listingFallback.title.trim(),
                description: cleanDesc ? `${cleanDesc}${suffix}` : `Imported listing.${suffix}`,
                requirements: [],
                preferredCertifications: [],
                suggestedPrograms: [],
                status: 'draft',
              }),
            });
            created.push({ id: job.id, title: job.title, provider: 'listing-fallback' });
            continue;
          }
          errors.push({
            source: url,
            error: !isAIConfigured()
              ? 'Job parse requires GROQ_API_KEY to be configured on the server.'
              : 'Could not parse job posting. Check server logs for [parseJobFromText].',
          });
          continue;
        }
        const suffix = `

---
Imported from: ${url}`;
        const job = await prisma.job.create({
          data: buildEmployerJobCreateData(ctx.employerId, {
            title: extracted.title,
            location: extracted.location,
            locationType: extracted.locationType ?? 'onsite',
            jobType: extracted.jobType ?? 'fulltime',
            salaryMin: extracted.salaryMin,
            salaryMax: extracted.salaryMax,
            description: `${extracted.description}${suffix}`,
            requirements: extracted.requirements ?? [],
            preferredCertifications: extracted.preferredCertifications ?? [],
            suggestedPrograms: extracted.suggestedPrograms ?? [],
            status: 'draft',
          }),
        });
        created.push({
          id: job.id,
          title: job.title,
          provider: parsed ? 'ai+per-job' : 'scrape+fallback',
        });
      }
      careersPageProcessed = true; // Tried sub-URLs, skip raw list AI parse
    }
  }

  // ── Fallback: AI-parse listings text (when no sub-URLs or sub-URL fetch failed) ──
  if (listingsText.length >= 80 && !careersPageProcessed) {
    const listings = await parseJobListingsFromPageText(listingsText);
    if (!listings?.length) {
      errors.push({ source: 'careers page', error: 'AI did not find separate job listings in that text.' });
    } else {
      const baseNote = careersPageUrl ? `\n\n---\nImported from careers page: ${careersPageUrl}` : '';
      for (const L of listings) {
        const cleanDesc = stripUrlsFromDescription(L.description.trim());
        const urlNote = L.sourceUrl ? `\n\n---\nImported from: ${L.sourceUrl}` : baseNote;
        const job = await prisma.job.create({
          data: buildEmployerJobCreateData(ctx.employerId, {
            title: L.title.trim(),
            description: cleanDesc ? `${cleanDesc}${urlNote}` : `Imported listing.${urlNote}`,
            requirements: [],
            preferredCertifications: [],
            suggestedPrograms: [],
            status: 'draft',
          }),
        });
        created.push({ id: job.id, title: job.title, provider: 'ai' });
      }
    }
  }

    if (created.length === 0 && errors.length === 0) {
      return NextResponse.json({ error: 'Nothing to import. Check URLs or pasted text.' }, { status: 400 });
    }

    return NextResponse.json({ created, errors }, { status: 201 });
  } catch (error) {
    const detail = getRouteErrorDetails(error);
    console.error('Employer bulk import failed', detail);
    return NextResponse.json(
      { error: 'Failed to create draft jobs.', detail: detail.message, code: detail.code },
      { status: 500 }
    );
  }
}
