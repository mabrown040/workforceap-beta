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
import { recordWorkflowDiagnostic } from '@/lib/diagnostics';
import { trackEvent } from '@/lib/events/track';
import { assertPublicHttpUrl, UnsafeUrlError } from '@/lib/http/safeOutboundFetch';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const importSchema = z.object({
  url: z.string().url().optional(),
  rawText: z.string().min(1).max(60_000).optional(),
  createDraft: z.boolean().optional(),
}).refine((d) => d.url || d.rawText, { message: 'Provide url or rawText' });

async function parseDirectJobUrl(url: string) {
  const result = await fetchSubJobPageText(url, { waitFor: getImportWaitForMs(url) });
  
  if ('error' in result || !result.text) {
    return null;
  }

  const textToParse = result.text;
  if (textToParse.length < 50) return null;
  
  const parsedJob = await parseJobFromText(textToParse);
  const extractedRaw = parsedJob ?? buildFallbackParsedJobFromScrape(undefined, textToParse);
  if (!extractedRaw) return null;
  
  return {
    extracted: normalizeImportedParsedJob(extractedRaw),
    provider: parsedJob ? 'ai+direct-job-url' : 'scrape+fallback',
  };
}export const POST = withApiGuc(async (request: NextRequest) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await getEmployerForUser(user.id);
    if (!ctx) return NextResponse.json({ error: 'Forbidden: employer access required' }, { status: 403 });

    const employerExists = await prisma.$transaction((tx) => tx.employer.findUnique({
      where: { id: ctx.employerId },
      select: { id: true, organizationId: true },
    }));
    if (!employerExists) {
      return NextResponse.json({ error: 'Selected employer record was not found.' }, { status: 400 });
    }
    const { organizationId } = employerExists;

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
    if (parsed.data.url) {
      try {
        parsed.data.url = assertPublicHttpUrl(parsed.data.url).toString();
      } catch (err) {
        if (err instanceof UnsafeUrlError) {
          return NextResponse.json({ error: 'Provide a valid public job posting URL.' }, { status: 400 });
        }
        throw err;
      }
    }

    await trackEvent({
      userId: user.id,
      eventName: 'employer_import_started',
      entityType: 'employer',
      entityId: ctx.employerId,
      metadata: { hasUrl: !!parsed.data.url, hasRawText: !!parsed.data.rawText, createDraft: !!parsed.data.createDraft },
      sourcePage: '/employer/jobs/import',
    });
    await recordWorkflowDiagnostic({
      workflow: 'employer_import_single',
      status: 'started',
      actorUserId: user.id,
      entityType: 'employer',
      entityId: ctx.employerId,
      summary: 'Employer job import started',
      method: parsed.data.url ? 'url' : 'raw_text',
      metadata: { url: parsed.data.url ?? null, createDraft: !!parsed.data.createDraft },
    });

    if (parsed.data.url && !parsed.data.rawText) {
      const providerMatch = detectProvider(parsed.data.url);
      const shouldTreatAsDirectJobUrl =
        isLikelyJobDetailUrl(parsed.data.url)
        && !isKnownStructuredApiProvider(providerMatch?.provider);

      if (shouldTreatAsDirectJobUrl) {
        const directResult = await parseDirectJobUrl(parsed.data.url);
        if (directResult) {
          if (parsed.data.createDraft) {
            const job = await prisma.$transaction((tx) => tx.job.create({
              data: buildEmployerJobCreateData(organizationId, ctx.employerId, {
                title: directResult.extracted.title,
                location: directResult.extracted.location,
                locationType: directResult.extracted.locationType ?? 'onsite',
                jobType: directResult.extracted.jobType ?? 'fulltime',
                salaryMin: directResult.extracted.salaryMin,
                salaryMax: directResult.extracted.salaryMax,
                description: directResult.extracted.description,
                sourceUrl: parsed.data.url,
                importProvider: directResult.provider,
                importMethod: 'direct-job-url',
                requirements: directResult.extracted.requirements ?? [],
                preferredCertifications: directResult.extracted.preferredCertifications ?? [],
                suggestedPrograms: directResult.extracted.suggestedPrograms ?? [],
                status: 'draft',
              }),
            }));
            await trackEvent({ userId: user.id, eventName: 'employer_import_succeeded', entityType: 'job', entityId: job.id, metadata: { provider: directResult.provider, method: 'direct_job_url' }, sourcePage: '/employer/jobs/import' });
            await recordWorkflowDiagnostic({ workflow: 'employer_import_single', status: 'success', actorUserId: user.id, entityType: 'job', entityId: job.id, summary: 'Direct job URL imported as draft', provider: directResult.provider, method: 'direct_job_url' });
            return NextResponse.json({ job, created: true, provider: directResult.provider }, { status: 201 });
          }
          await trackEvent({ userId: user.id, eventName: directResult.provider.includes('fallback') ? 'employer_import_fallback_used' : 'employer_import_succeeded', entityType: 'employer', entityId: ctx.employerId, metadata: { provider: directResult.provider, method: 'direct_job_url_review' }, sourcePage: '/employer/jobs/import' });
          await recordWorkflowDiagnostic({ workflow: 'employer_import_single', status: directResult.provider.includes('fallback') ? 'fallback' : 'success', actorUserId: user.id, entityType: 'employer', entityId: ctx.employerId, summary: 'Direct job URL parsed for review', provider: directResult.provider, method: 'direct_job_url_review', fallbackPath: directResult.provider.includes('fallback') ? directResult.provider : null });
          return NextResponse.json({
            extracted: {
              ...directResult.extracted,
              sourceUrl: parsed.data.url,
              importProvider: directResult.provider,
              importMethod: 'direct-job-url',
            },
            provider: directResult.provider,
          });
        }
      }

      const atsResult = await smartImportJobs(parsed.data.url);

      if (atsResult.jobs.length > 0) {
        if (parsed.data.createDraft) {
          const created = [];
          for (const atsJob of atsResult.jobs) {
            const job = await prisma.$transaction((tx) => tx.job.create({
              data: buildEmployerJobCreateData(organizationId, ctx.employerId, {
                title: atsJob.title,
                location: atsJob.location,
                locationType: atsJob.locationType ?? 'onsite',
                jobType: atsJob.jobType ?? 'fulltime',
                salaryMin: atsJob.salaryMin,
                salaryMax: atsJob.salaryMax,
                description: atsJob.description,
                sourceUrl: atsJob.sourceUrl,
                importProvider: atsResult.provider,
                importMethod: 'structured-api',
                requirements: atsJob.requirements ?? [],
                preferredCertifications: [],
                suggestedPrograms: [],
                status: 'draft',
              }),
            }));
              created.push({ id: job.id, title: job.title });
            }
            await trackEvent({ userId: user.id, eventName: 'employer_import_succeeded', entityType: 'employer', entityId: ctx.employerId, metadata: { provider: atsResult.provider, method: 'structured_ats', total: created.length }, sourcePage: '/employer/jobs/import' });
            await recordWorkflowDiagnostic({ workflow: 'employer_import_single', status: 'success', actorUserId: user.id, entityType: 'employer', entityId: ctx.employerId, summary: `Structured ATS import created ${created.length} draft(s)`, provider: atsResult.provider, method: 'structured_ats' });
            return NextResponse.json({
            provider: atsResult.provider,
            created,
            total: atsResult.jobs.length,
          }, { status: 201 });
        }

        return NextResponse.json({
          provider: atsResult.provider,
          extracted: atsResult.jobs.length === 1
            ? { ...atsResult.jobs[0], importProvider: atsResult.provider, importMethod: 'structured-api' }
            : undefined,
          jobs: atsResult.jobs.length > 1
            ? atsResult.jobs.map((job) => ({ ...job, importProvider: atsResult.provider, importMethod: 'structured-api' }))
            : undefined,
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
              const job = await prisma.$transaction((tx) => tx.job.create({
                data: buildEmployerJobCreateData(organizationId, ctx.employerId, {
                  title: extracted.title,
                  location: extracted.location,
                  locationType: extracted.locationType ?? 'onsite',
                  jobType: extracted.jobType ?? 'fulltime',
                  salaryMin: extracted.salaryMin,
                  salaryMax: extracted.salaryMax,
                  description: extracted.description,
                  sourceUrl: parsed.data.url,
                  importProvider: provider,
                  importMethod: 'url-text-parse',
                  requirements: extracted.requirements ?? [],
                  preferredCertifications: extracted.preferredCertifications ?? [],
                  suggestedPrograms: extracted.suggestedPrograms ?? [],
                  status: 'draft',
                }),
              }));
              await trackEvent({ userId: user.id, eventName: parsedJob ? 'employer_import_succeeded' : 'employer_import_fallback_used', entityType: 'job', entityId: job.id, metadata: { provider, method: 'ats_raw_text' }, sourcePage: '/employer/jobs/import' });
              await recordWorkflowDiagnostic({ workflow: 'employer_import_single', status: parsedJob ? 'success' : 'fallback', actorUserId: user.id, entityType: 'job', entityId: job.id, summary: 'ATS raw text imported as draft', provider, method: 'ats_raw_text', fallbackPath: parsedJob ? null : 'buildFallbackParsedJobFromScrape' });
              return NextResponse.json({ job, created: true, provider }, { status: 201 });
            }
            await trackEvent({ userId: user.id, eventName: parsedJob ? 'employer_import_succeeded' : 'employer_import_fallback_used', entityType: 'employer', entityId: ctx.employerId, metadata: { provider, method: 'ats_raw_text_review' }, sourcePage: '/employer/jobs/import' });
            await recordWorkflowDiagnostic({ workflow: 'employer_import_single', status: parsedJob ? 'success' : 'fallback', actorUserId: user.id, entityType: 'employer', entityId: ctx.employerId, summary: 'ATS raw text parsed for review', provider, method: 'ats_raw_text_review', fallbackPath: parsedJob ? null : 'buildFallbackParsedJobFromScrape' });
            return NextResponse.json({
              extracted: {
                ...extracted,
                sourceUrl: parsed.data.url,
                importProvider: provider,
                importMethod: 'url-text-parse',
              },
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
      await recordWorkflowDiagnostic({ workflow: 'employer_import_single', status: 'error', actorUserId: user.id, entityType: 'employer', entityId: ctx.employerId, summary: 'Raw text import could not extract job details', method: 'raw_text', failureReason: 'no_extracted_payload' });
      return NextResponse.json({ error: 'Could not extract job details. Please edit the form manually.' }, { status: 400 });
    }

    const provider = parsedJob ? 'ai' : 'scrape+fallback';
    const importMethod = parsed.data.url ? 'raw-text-with-url' : 'raw-text';
    if (parsed.data.createDraft === true) {
      const job = await prisma.$transaction((tx) => tx.job.create({
        data: buildEmployerJobCreateData(organizationId, ctx.employerId, {
          title: extracted.title,
          location: extracted.location,
          locationType: extracted.locationType ?? 'onsite',
          jobType: extracted.jobType ?? 'fulltime',
          salaryMin: extracted.salaryMin,
          salaryMax: extracted.salaryMax,
          description: extracted.description,
          sourceUrl: parsed.data.url,
          importProvider: provider,
          importMethod,
          requirements: extracted.requirements ?? [],
          preferredCertifications: extracted.preferredCertifications ?? [],
          suggestedPrograms: extracted.suggestedPrograms ?? [],
          status: 'draft',
        }),
      }));
      await trackEvent({ userId: user.id, eventName: parsedJob ? 'employer_import_succeeded' : 'employer_import_fallback_used', entityType: 'job', entityId: job.id, metadata: { provider, method: 'raw_text' }, sourcePage: '/employer/jobs/import' });
      await recordWorkflowDiagnostic({ workflow: 'employer_import_single', status: parsedJob ? 'success' : 'fallback', actorUserId: user.id, entityType: 'job', entityId: job.id, summary: 'Raw text import created draft', provider, method: 'raw_text', fallbackPath: parsedJob ? null : 'buildFallbackParsedJobFromScrape' });
      return NextResponse.json({ job, created: true, provider }, { status: 201 });
    }

    await trackEvent({ userId: user.id, eventName: parsedJob ? 'employer_import_succeeded' : 'employer_import_fallback_used', entityType: 'employer', entityId: ctx.employerId, metadata: { provider, method: 'raw_text_review' }, sourcePage: '/employer/jobs/import' });
    await recordWorkflowDiagnostic({ workflow: 'employer_import_single', status: parsedJob ? 'success' : 'fallback', actorUserId: user.id, entityType: 'employer', entityId: ctx.employerId, summary: 'Raw text import parsed for review', provider, method: 'raw_text_review', fallbackPath: parsedJob ? null : 'buildFallbackParsedJobFromScrape' });

    return NextResponse.json({
      extracted: {
        ...extracted,
        ...(parsed.data.url ? { sourceUrl: parsed.data.url } : {}),
        importProvider: provider,
        importMethod,
      },
      provider,
    });
  } catch (error) {
    const detail = getRouteErrorDetails(error);
    console.error('Employer job import failed', detail);
    await recordWorkflowDiagnostic({
      workflow: 'employer_import_single',
      status: 'error',
      summary: 'Employer job import request failed',
      failureReason: detail.message,
      metadata: { code: detail.code },
    });
    return NextResponse.json(
      { error: 'Failed to import job.', detail: detail.message, code: detail.code },
      { status: 500 }
    );
  }
});
