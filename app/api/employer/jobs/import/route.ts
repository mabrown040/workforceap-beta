import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { parseJobFromText, buildFallbackParsedJobFromScrape } from '@/lib/ai/parseJob';
import { smartImportJobs, detectProvider } from '@/lib/ai/atsProviders';
import { buildEmployerJobCreateData, getRouteErrorDetails } from '@/lib/employer/jobCreate';

const importSchema = z.object({
  url: z.string().url().optional(),
  rawText: z.string().min(1).optional(),
  createDraft: z.boolean().optional(),
}).refine((d) => d.url || d.rawText, { message: 'Provide url or rawText' });

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 15000);
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

    const body = await request.json().catch(() => null);
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Provide url or rawText' }, { status: 400 });
    }

    // ── URL-based import (smart ATS detection) ──
    if (parsed.data.url && !parsed.data.rawText) {
      const atsResult = await smartImportJobs(parsed.data.url);

      // If ATS API returned structured jobs, use them directly
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

      // ATS errors (JS-rendered, etc)
      if (atsResult.errors.length > 0) {
        return NextResponse.json({
          error: atsResult.errors[0],
          provider: atsResult.provider,
          tip: 'Try pasting the job description text instead, or use a direct link to a specific job posting.',
        }, { status: 400 });
      }

      // Use text already fetched by smartImportJobs (no double-fetch)
      try {
        const textToParse = atsResult.rawText;
        if (textToParse && textToParse.length >= 50) {
          const parsedJob = await parseJobFromText(textToParse);
          const extracted =
            parsedJob ?? buildFallbackParsedJobFromScrape(undefined, textToParse);
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
                  description: extracted.description,
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
        tip: detectProvider(parsed.data.url)
          ? `Detected ATS: ${detectProvider(parsed.data.url)!.provider}. Try a direct link to a specific job posting.`
          : undefined,
      }, { status: 400 });
    }

    // ── Raw text import (AI parsing) ──
    let textToParse = parsed.data.rawText;
    if (parsed.data.url && textToParse) {
      // Both provided — use text, note the URL
    }

    if (!textToParse || textToParse.length < 50) {
      return NextResponse.json({ error: 'Not enough text to parse. Paste the full job description.' }, { status: 400 });
    }

    const parsedJob = await parseJobFromText(textToParse);
    const extracted = parsedJob ?? buildFallbackParsedJobFromScrape(undefined, textToParse);
    if (!extracted) {
      return NextResponse.json({ error: 'Could not extract job details. Please edit the form manually.' }, { status: 400 });
    }

    const provider = parsedJob ? 'ai' : 'scrape+fallback';
    const createDraft = parsed.data.createDraft === true;
    if (createDraft) {
      const job = await prisma.job.create({
        data: buildEmployerJobCreateData(ctx.employerId, {
          title: extracted.title,
          location: extracted.location,
          locationType: extracted.locationType ?? 'onsite',
          jobType: extracted.jobType ?? 'fulltime',
          salaryMin: extracted.salaryMin,
          salaryMax: extracted.salaryMax,
          description: extracted.description,
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
