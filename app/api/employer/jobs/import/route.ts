import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import {
  buildFallbackParsedJobFromScrape,
  normalizeImportedParsedJob,
  parseJobFromText,
} from '@/lib/ai/parseJob';
import {
  detectProvider,
  fetchSubJobPageText,
  getImportWaitForMs,
  isKnownStructuredApiProvider,
  isLikelyJobDetailUrl,
  smartImportJobs,
} from '@/lib/ai/atsProviders';
import { buildEmployerJobCreateData, getRouteErrorDetails } from '@/lib/employer/jobCreate';
import { checkEmployerJobImportRateLimit } from '@/lib/rate-limit';

const importSchema = z.object({
  url: z.string().url().optional(),
  rawText: z.string().min(1).max(60_000).optional(),
  createDraft: z.boolean().optional(),
}).refine((d) => d.url || d.rawText, { message: 'Provide url or rawText' });

function appendImportedFrom(description: string, sourceUrl?: string): string {
  return sourceUrl ? `${description}\n\n---\nImported from: ${sourceUrl}` : description;
}

async function parseDirectJobUrl(url: string) {
  const textToParse = await fetchSubJobPageText(url, { waitFor: getImportWaitForMs(url) });
  if (!textToParse || textToParse.length < 50) return null;
  const parsedJob = await parseJobFromText(textToParse);
  const extractedRaw = parsedJob ?? buildFallbackParsedJobFromScrape(undefined, textToParse);
  if (!extractedRaw) return null;
  return {
    extracted: normalizeImportedParsedJob(extractedRaw),
    provider: parsedJob ? 'ai+direct-job-url' : 'scrape+fallback',
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
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Provide url or rawText' }, { status: 400 });
    }

    if (parsed.data.url && !parsed.data.rawText) {
      const providerMatch = detectProvider(parsed.data.url);
      const shouldTreatAsDirectJobUrl =
        isLikelyJobDetailUrl(parsed.data.url)
        && !isKnownStructuredApiProvider(providerMatch?.provider);

      if (shouldTreatAsDirectJobUrl) {
        const directResult = await parseDirectJobUrl(parsed.data.url);
        if (directResult) {
          if (parsed.data.createDraft) {
            const job = await prisma.job.create({
              data: buildEmployerJobCreateData(ctx.employerId, {
                title: directResult.extracted.title,
                location: directResult.extracted.location,
                locationType: directResult.extracted.locationType ?? 'onsite',
                jobType: directResult.extracted.jobType ?? 'fulltime',
                salaryMin: directResult.extracted.salaryMin,
                salaryMax: directResult.extracted.salaryMax,
                description: appendImportedFrom(directResult.extracted.description, parsed.data.url),
                requirements: directResult.extracted.requirements ?? [],
                preferredCertifications: directResult.extracted.preferredCertifications ?? [],
                suggestedPrograms: directResult.extracted.suggestedPrograms ?? [],
                status: 'draft',
              }),
            });
            return NextResponse.json({ job, created: true, provider: directResult.provider }, { status: 201 });
          }
          return NextResponse.json({
            extracted: { ...directResult.extracted, sourceUrl: parsed.data.url },
            provider: directResult.provider,
          });
        }
      }

      const atsResult = await smartImportJobs(parsed.data.url);

      if (atsResult.jobs.length > 0) {
        if (parsed.data.createDraft) {
          const created = [];
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
            created.push({ id: job.id, title: job.title });
          }
          return NextResponse.json({
            provider: atsResult.provider,
            created,
            total: atsResult.jobs.length,
          }, { status: 201 });
        }

        return NextResponse.json({
          provider: atsResult.provider,
          extracted: atsResult.jobs.length === 1 ? atsResult.jobs[0] : undefined,
          jobs: atsResult.jobs.length > 1 ? atsResult.jobs : undefined,
          total: atsResult.jobs.length,
        });
      }

      if (atsResult.errors.length > 0) {
        return NextResponse.json({
          error: atsResult.errors[0],
          provider: atsResult.provider,
          tip: 'Try pasting the job description text instead, or use a direct link to a specific job posting.',
        }, { status: 400 });
      }

      try {
        const textToParse = atsResult.rawText;
        if (textToParse && textToParse.length >= 50) {
          const parsedJob = await parseJobFromText(textToParse);
          const extractedRaw = parsedJob ?? buildFallbackParsedJobFromScrape(undefined, textToParse);
          const extracted = extractedRaw ? normalizeImportedParsedJob(extractedRaw) : null;
          if (extracted) {
            const provider = parsedJob ? 'ai' : 'scrape+fallback';
            if (parsed.data.createDraft) {
              const job = await prisma.job.create({
                data: buildEmployerJobCreateData(ctx.employerId, {
                  title: extracted.title,
                  location: extracted.location,
                  locationType: extracted.locationType ?? 'onsite',
                  jobType: extracted.jobType ?? 'fulltime',
                  salaryMin: extracted.salaryMin,
                  salaryMax: extracted.salaryMax,
                  description: appendImportedFrom(extracted.description, parsed.data.url),
                  requirements: extracted.requirements ?? [],
                  preferredCertifications: extracted.preferredCertifications ?? [],
                  suggestedPrograms: extracted.suggestedPrograms ?? [],
                  status: 'draft',
                }),
              });
              return NextResponse.json({ job, created: true, provider }, { status: 201 });
            }
            return NextResponse.json({
              extracted: { ...extracted, sourceUrl: parsed.data.url },
              provider,
            });
          }
        }
      } catch {
        // Fall through to error
      }

      return NextResponse.json({
        error: 'Could not extract job details from this URL. Try pasting the job description text.',
        tip: providerMatch
          ? `Detected ATS: ${providerMatch.provider}. Try a direct link to a specific job posting.`
          : undefined,
      }, { status: 400 });
    }

    const textToParse = parsed.data.rawText;
    if (!textToParse || textToParse.length < 50) {
      return NextResponse.json({ error: 'Not enough text to parse. Paste the full job description.' }, { status: 400 });
    }

    const parsedJob = await parseJobFromText(textToParse);
    const extractedRaw = parsedJob ?? buildFallbackParsedJobFromScrape(undefined, textToParse);
    const extracted = extractedRaw ? normalizeImportedParsedJob(extractedRaw) : null;
    if (!extracted) {
      return NextResponse.json({ error: 'Could not extract job details. Please edit the form manually.' }, { status: 400 });
    }

    const provider = parsedJob ? 'ai' : 'scrape+fallback';
    if (parsed.data.createDraft === true) {
      const job = await prisma.job.create({
        data: buildEmployerJobCreateData(ctx.employerId, {
          title: extracted.title,
          location: extracted.location,
          locationType: extracted.locationType ?? 'onsite',
          jobType: extracted.jobType ?? 'fulltime',
          salaryMin: extracted.salaryMin,
          salaryMax: extracted.salaryMax,
          description: appendImportedFrom(extracted.description, parsed.data.url),
          requirements: extracted.requirements ?? [],
          preferredCertifications: extracted.preferredCertifications ?? [],
          suggestedPrograms: extracted.suggestedPrograms ?? [],
          status: 'draft',
        }),
      });
      return NextResponse.json({ job, created: true, provider }, { status: 201 });
    }

    return NextResponse.json({
      extracted: parsed.data.url ? { ...extracted, sourceUrl: parsed.data.url } : extracted,
      provider,
    });
  } catch (error) {
    const detail = getRouteErrorDetails(error);
    console.error('Employer job import failed', detail);
    return NextResponse.json(
      { error: 'Failed to import job.', detail: detail.message, code: detail.code },
      { status: 500 }
    );
  }
}
