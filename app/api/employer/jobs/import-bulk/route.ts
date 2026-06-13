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
import { insertEmployerJobsBatch } from '@/lib/employer/bulkJobInsert';
import { buildEmployerJobCreateData, getRouteErrorDetails } from '@/lib/employer/jobCreate';
import { collectDraftInputsFromPageText, type ImportedDraftInput } from '@/lib/employer/jobImportBulk';
import { checkEmployerJobImportRateLimit } from '@/lib/rate-limit';
import { recordWorkflowDiagnostic } from '@/lib/diagnostics';
import { trackEvent } from '@/lib/events/track';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const bulkSchema = z
  .object({
    jobUrls: z.array(z.string().url()).max(15).optional(),
    careersPageUrl: z.string().url().optional(),
    careersPageRawText: z.string().min(80).max(200_000).optional(),
  })
  .refine((d) => (d.jobUrls?.length ?? 0) > 0 || d.careersPageUrl || d.careersPageRawText, {
    message: 'Provide jobUrls, careersPageUrl, or careersPageRawText',
  });

function jobDataFromParsedJob(
  organizationId: string,
  employerId: string,
  extracted: ParsedJob,
  sourceUrl: string,
  importProvider: string,
  importMethod: string
) {
  const normalized = normalizeImportedParsedJob(extracted);
  return buildEmployerJobCreateData(organizationId, employerId, {
    title: normalized.title,
    location: normalized.location,
    locationType: normalized.locationType ?? 'onsite',
    jobType: normalized.jobType ?? 'fulltime',
    salaryMin: normalized.salaryMin,
    salaryMax: normalized.salaryMax,
    description: normalized.description,
    sourceUrl,
    importProvider,
    importMethod,
    requirements: normalized.requirements ?? [],
    preferredCertifications: normalized.preferredCertifications ?? [],
    suggestedPrograms: normalized.suggestedPrograms ?? [],
    status: 'draft',
  });
}

function jobDataFromImportedDraft(organizationId: string, employerId: string, draft: ImportedDraftInput) {
  return buildEmployerJobCreateData(organizationId, employerId, {
    title: draft.title,
    location: draft.location,
    locationType: draft.locationType,
    jobType: draft.jobType,
    salaryMin: draft.salaryMin,
    salaryMax: draft.salaryMax,
    description: draft.description,
    sourceUrl: draft.sourceUrl,
    importProvider: draft.importProvider,
    importMethod: draft.importMethod,
    requirements: draft.requirements ?? [],
    preferredCertifications: draft.preferredCertifications ?? [],
    suggestedPrograms: draft.suggestedPrograms ?? [],
    status: 'draft',
  });
}

async function parseSingleJobUrl(url: string): Promise<{ extracted: ParsedJob; provider: string } | null> {
  const result = await fetchSubJobPageText(url, { waitFor: getImportWaitForMs(url) });
  
  if ('error' in result || !result.text) {
    return null;
  }

  const textForParse = result.text;
  if (textForParse.length < 50) return null;
  
  const parsed = await parseJobFromText(textForParse);
  const extractedRaw = parsed ?? buildFallbackParsedJobFromScrape(undefined, textForParse);
  if (!extractedRaw) return null;
  
  return {
    extracted: normalizeImportedParsedJob(extractedRaw),
    provider: parsed ? 'ai+per-job' : 'scrape+fallback',
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
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid body' }, { status: 400 });
    }

    const created: { id: string; title: string; provider?: string }[] = [];
    const errors: { source: string; error: string }[] = [];

    const { jobUrls, careersPageUrl, careersPageRawText } = parsed.data;

    await trackEvent({
      userId: user.id,
      eventName: 'employer_import_started',
      entityType: 'employer',
      entityId: ctx.employerId,
      metadata: {
        mode: 'bulk',
        jobUrlCount: jobUrls?.length ?? 0,
        hasCareersPageUrl: !!careersPageUrl,
        hasCareersPageRawText: !!careersPageRawText,
      },
      sourcePage: '/employer/jobs/import',
    });
    await recordWorkflowDiagnostic({
      workflow: 'employer_import_bulk',
      status: 'started',
      actorUserId: user.id,
      entityType: 'employer',
      entityId: ctx.employerId,
      summary: 'Bulk employer import started',
      method: 'bulk',
      metadata: { jobUrlCount: jobUrls?.length ?? 0, hasCareersPageUrl: !!careersPageUrl, hasCareersPageRawText: !!careersPageRawText },
    });

    if (jobUrls?.length) {
      for (const url of jobUrls) {
        const atsResult = await smartImportJobs(url);

        if (atsResult.jobs.length > 0) {
          const batch = atsResult.jobs.map((atsJob) =>
            buildEmployerJobCreateData(organizationId, ctx.employerId, {
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
            })
          );
          created.push(...(await insertEmployerJobsBatch(organizationId, batch)));
          continue;
        }

        if (atsResult.rawText && atsResult.rawText.length >= 80) {
          const collected = await collectDraftInputsFromPageText(atsResult.rawText, { baseUrl: url });
          if (collected.handled) {
            const batch = collected.drafts.map((d) => jobDataFromImportedDraft(organizationId, ctx.employerId, d));
            created.push(...(await insertEmployerJobsBatch(organizationId, batch)));
            errors.push(...collected.errors);
            continue;
          }
        }

        if (atsResult.rawText && atsResult.rawText.length >= 50) {
          const parsedJob = await parseJobFromText(atsResult.rawText);
          const extractedRaw = parsedJob ?? buildFallbackParsedJobFromScrape(undefined, atsResult.rawText);
          if (extractedRaw) {
            const row = jobDataFromParsedJob(
              organizationId,
              ctx.employerId,
              extractedRaw,
              url,
              parsedJob ? 'ai' : 'scrape+fallback',
              'url-text-parse'
            );
            created.push(...(await insertEmployerJobsBatch(organizationId, [row])));
            continue;
          }
        }

        if (atsResult.errors.length > 0) {
          errors.push({ source: url, error: atsResult.errors[0] });
          continue;
        }

        const directResult = await parseSingleJobUrl(url);
        if (directResult) {
          const row = jobDataFromParsedJob(
            organizationId,
            ctx.employerId,
            directResult.extracted,
            url,
            directResult.provider,
            'direct-job-url'
          );
          created.push(...(await insertEmployerJobsBatch(organizationId, [row])));
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
        const batch = atsResult.jobs.map((atsJob) =>
          buildEmployerJobCreateData(organizationId, ctx.employerId, {
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
          })
        );
        created.push(...(await insertEmployerJobsBatch(organizationId, batch)));
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
        const batch = collected.drafts.map((d) => jobDataFromImportedDraft(organizationId, ctx.employerId, d));
        created.push(...(await insertEmployerJobsBatch(organizationId, batch)));
        errors.push(...collected.errors);
        careersPageProcessed = true;
      }
    }

    if (listingsText.length >= 80 && !careersPageProcessed) {
      errors.push({ source: 'careers page', error: 'AI did not find separate job listings in that text.' });
    }

    if (created.length === 0 && errors.length === 0) {
      await recordWorkflowDiagnostic({ workflow: 'employer_import_bulk', status: 'error', actorUserId: user.id, entityType: 'employer', entityId: ctx.employerId, summary: 'Bulk employer import produced no drafts', method: 'bulk', failureReason: 'nothing_to_import' });
      return NextResponse.json({ error: 'Nothing to import. Check URLs or pasted text.' }, { status: 400 });
    }

    await trackEvent({
      userId: user.id,
      eventName: errors.length > 0 ? 'employer_import_fallback_used' : 'employer_import_succeeded',
      entityType: 'employer',
      entityId: ctx.employerId,
      metadata: { mode: 'bulk', createdCount: created.length, errorCount: errors.length, providers: created.map((item) => item.provider).filter(Boolean) },
      sourcePage: '/employer/jobs/import',
    });
    await recordWorkflowDiagnostic({
      workflow: 'employer_import_bulk',
      status: errors.length > 0 ? 'fallback' : 'success',
      actorUserId: user.id,
      entityType: 'employer',
      entityId: ctx.employerId,
      summary: `Bulk employer import created ${created.length} draft(s) with ${errors.length} error(s)`,
      method: 'bulk',
      fallbackPath: errors.length > 0 ? 'mixed_provider_fallbacks' : null,
      metadata: { created, errors },
    });

    return NextResponse.json({ created, errors }, { status: 201 });
  } catch (error) {
    const detail = getRouteErrorDetails(error);
    console.error('Employer bulk import failed', detail);
    await recordWorkflowDiagnostic({
      workflow: 'employer_import_bulk',
      status: 'error',
      summary: 'Employer bulk import request failed',
      failureReason: detail.message,
      metadata: { code: detail.code },
    });
    return NextResponse.json(
      { error: 'Failed to create draft jobs.', detail: detail.message, code: detail.code },
      { status: 500 }
    );
  }
});
