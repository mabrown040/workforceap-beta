import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { parseJobFromText } from '@/lib/ai/parseJob';

const importSchema = z.object({
  url: z.string().url().optional(),
  rawText: z.string().min(1).optional(),
}).refine((d) => d.url || d.rawText, { message: 'Provide url or rawText' });

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

  let textToParse = parsed.data.rawText;
  if (parsed.data.url && !textToParse) {
    try {
      const res = await fetch(parsed.data.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WorkforceAP/1.0)' },
      });
      if (res.ok) {
        const html = await res.text();
        textToParse = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 15000);
      }
    } catch {
      return NextResponse.json({ error: 'Could not fetch URL. Try pasting the job description instead.' }, { status: 400 });
    }
  }

  if (!textToParse || textToParse.length < 50) {
    return NextResponse.json({ error: 'Not enough text to parse. Paste the full job description.' }, { status: 400 });
  }

  const extracted = await parseJobFromText(textToParse);
  if (!extracted) {
    return NextResponse.json({ error: 'Could not extract job details. Please edit the form manually.' }, { status: 400 });
  }

  const createDraft = body.createDraft === true;
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
    return NextResponse.json({ job, created: true }, { status: 201 });
  }

  return NextResponse.json({
    extracted: parsed.data.url ? { ...extracted, sourceUrl: parsed.data.url } : extracted,
  });
}
