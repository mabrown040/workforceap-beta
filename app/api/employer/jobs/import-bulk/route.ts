import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import {
  buildFallbackParsedJobFromScrape,
  normalizeImportedParsedJob,
  parseJobFromText,
  sanitizeScrapedJobText,
  type ParsedJob,
} from '@/lib/ai/parseJob';
import {
  fetchSubJobPageText,
  getImportWaitForMs,
  smartImportJobs,
} from '@/lib/ai/atsProviders';
import { isAIConfigured } from '@/lib/ai/groq';
import { buildEmployerJobCreateData, getRouteErrorDetails } from '@/lib/employer/jobCreate';
import { appendImportedFrom, collectDraftInputsFromPageText, type ImportedDraftInput } from '@/lib/employer/jobImportBulk';
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

async function createDraftFromParsedJob(
  employerId: string,
  extracted: ParsedJob,
  sourceUrl: string,
  provider: string
) {
  const normalized = normalizeImportedParsedJob(extracted);
  const job = await prisma.job.create({
    data: buildEmployerJobCreateData(employerId, {
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
      status: 'draft',
    }),
  });
  return { id: job.id, title: job.title, provider };
}

async function createDraftFromImportedInput(
  employerId: string,
  draft: ImportedDraftInput
) {
  const job = await prisma.job.create({
    data: buildEmployerJobCreateData(employerId, {
      title: draft.title,
      location: draft.location,
      locationType: draft.locationType,
      jobType: draft.jobType,
      salaryMin: draft.salaryMin,
      salaryMax: draft.salaryMax,
      description: draft.description,
      requirements: draft.requirements ?? [],
      preferredCertifications: draft.preferredCertifications ?? [],
      suggestedPrograms: draft.suggestedPrograms ?? [],
      status: 'draft',
    }),
  });
  return { id: job.id, title: job.title, provider: draft.provider };
}

async function parseSingleJobUrl(url: string): Promise<{ extracted: ParsedJob; provider: string } | null> {
  const textForParse = await fetchSubJobPageText(url, { waitFor: getImportWaitForMs(url) });
  if (!textForParse || textForParse.length < 50) return null;
  const parsed = await parseJobFromText(textForParse);
  const extractedRaw = parsed ?? buildFallbackParsedJobFromScrape(undefined, textForParse);
  if (!extractedRaw) return null;
  return {
    extracted: normalizeImportedParsedJob(extractedRaw),
    provider: parsed ? 'ai+per-job' : 'scrape+fallback',
  };
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

    if (jobUrls?.length) {
      for (const url of jobUrls) {
        const atsResult = await smartImportJobs(url);

        if (atsResult.jobs.length > 0) {
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

        if (atsResult.rawText && atsResult.rawText.length >= 80) {
          const collected = await collectDraftInputsFromPageText(atsResult.rawText, { baseUrl: url });
          if (collected.handled) {
            for (const draft of collected.drafts) {
              created.push(await createDraftFromImportedInput(ctx.employerId, draft));
            }
            errors.push(...collected.errors);
            continue;
          }
        }

        if (atsResult.rawText && atsResult.rawText.length >= 50) {
          const parsedJob = await parseJobFromText(atsResult.rawText);
          const extractedRaw = parsedJob ?? buildFallbackParsedJobFromScrape(undefined, atsResult.rawText);
          if (extractedRaw) {
            created.push(await createDraftFromParsedJob(
              ctx.employerId,
              extractedRaw,
              url,
              parsedJob ? 'ai' : 'scrape+fallback'
            ));
            continue;
          }
        }

        if (atsResult.errors.length > 0) {
          errors.push({ source: url, error: atsResult.errors[0] });
          continue;
        }

        const directResult = await parseSingleJobUrl(url);
        if (directResult) {
          created.push(await createDraftFromParsedJob(
            ctx.employerId,
            directResult.extracted,
            url,
            directResult.provider
          ));
          continue;
        }

        errors.push({
          source: url,
          error: !isAIConfigured()
            ? 'Job parse requires GROQ_API_KEY to be configured on the server.'
            : 'Could not fetch or parse this job page. Try pasting the full description.',
        });
      }
    }

    let listingsText = careersPageRawText?.trim() ?? '';
    let careersPageProcessed = false;

    if (careersPageUrl && !listingsText) {
      const atsResult = await smartImportJobs(careersPageUrl);

      if (atsResult.jobs.length > 0) {
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
        listingsText = sanitizeScrapedJobText(atsResult.rawText);
      } else {
        errors.push({ source: careersPageUrl, error: 'Could not fetch careers page content. Paste the page text instead.' });
        careersPageProcessed = true;
      }
    }

    if (listingsText.length >= 80 && !careersPageProcessed) {
      const collected = await collectDraftInputsFromPageText(listingsText, { baseUrl: careersPageUrl });
      if (collected.handled) {
        for (const draft of collected.drafts) {
          created.push(await createDraftFromImportedInput(ctx.employerId, draft));
        }
        errors.push(...collected.errors);
        careersPageProcessed = true;
      }
    }

    if (listingsText.length >= 80 && !careersPageProcessed) {
      errors.push({ source: 'careers page', error: 'AI did not find separate job listings in that text.' });
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
