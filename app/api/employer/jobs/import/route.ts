import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { parseJobFromText } from '@/lib/ai/parseJob';
import { smartImportJobs, detectProvider } from '@/lib/ai/atsProviders';

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
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden: employer access required' }, { status: 403 });

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
            data: {
              employerId: ctx.employerId,
              title: atsJob.title,
              location: atsJob.location ?? undefined,
              locationType: atsJob.locationType ?? 'onsite',
              jobType: atsJob.jobType ?? 'fulltime',
              salaryMin: atsJob.salaryMin ?? undefined,
              salaryMax: atsJob.salaryMax ?? undefined,
              description: `${atsJob.description}${suffix}`,
              requirements: atsJob.requirements ?? [],
              preferredCertifications: [],
              suggestedPrograms: [],
              status: 'draft',
            },
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

    // Tier 2: Generic HTML — fall through to AI parsing
    try {
      const res = await fetch(parsed.data.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WorkforceAP/1.0)' },
      });
      if (res.ok) {
        const html = await res.text();
        const textToParse = stripHtmlToText(html);
        if (textToParse.length >= 50) {
          const extracted = await parseJobFromText(textToParse);
          if (extracted) {
            if (parsed.data.createDraft) {
              const job = await prisma.job.create({
                data: {
                  employerId: ctx.employerId,
                  title: extracted.title,
                  location: extracted.location ?? undefined,
                  locationType: extracted.locationType ?? 'onsite',
                  jobType: extracted.jobType ?? 'fulltime',
                  salaryMin: extracted.salaryMin ?? undefined,
                  salaryMax: extracted.salaryMax ?? undefined,
                  description: extracted.description,
                  requirements: extracted.requirements ?? [],
                  preferredCertifications: extracted.preferredCertifications ?? [],
                  suggestedPrograms: extracted.suggestedPrograms ?? [],
                  status: 'draft',
                },
              });
              return NextResponse.json({ job, created: true, provider: 'ai' }, { status: 201 });
            }
            return NextResponse.json({
              extracted: { ...extracted, sourceUrl: parsed.data.url },
              provider: 'ai',
            });
          }
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

  const extracted = await parseJobFromText(textToParse);
  if (!extracted) {
    return NextResponse.json({ error: 'Could not extract job details. Please edit the form manually.' }, { status: 400 });
  }

  const createDraft = parsed.data.createDraft === true;
  if (createDraft) {
    const job = await prisma.job.create({
      data: {
        employerId: ctx.employerId,
        title: extracted.title,
        location: extracted.location ?? undefined,
        locationType: extracted.locationType ?? 'onsite',
        jobType: extracted.jobType ?? 'fulltime',
        salaryMin: extracted.salaryMin ?? undefined,
        salaryMax: extracted.salaryMax ?? undefined,
        description: extracted.description,
        requirements: extracted.requirements ?? [],
        preferredCertifications: extracted.preferredCertifications ?? [],
        suggestedPrograms: extracted.suggestedPrograms ?? [],
        status: 'draft',
      },
    });
    return NextResponse.json({ job, created: true, provider: 'ai' }, { status: 201 });
  }

  return NextResponse.json({
    extracted: parsed.data.url ? { ...extracted, sourceUrl: parsed.data.url } : extracted,
    provider: 'ai',
  });
}
