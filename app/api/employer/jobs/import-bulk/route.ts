import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { parseJobFromText, parseJobListingsFromPageText } from '@/lib/ai/parseJob';
import { scrapeUrl } from '@/lib/firecrawl';

const bulkSchema = z
  .object({
    jobUrls: z.array(z.string().url()).max(15).optional(),
    careersPageUrl: z.string().url().optional(),
    careersPageRawText: z.string().min(80).optional(),
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
    if (res.ok) {
      const html = await res.text();
      const text = stripHtmlToText(html);
      if (text.length >= 80) return text;
    }
  } catch {
    /* fall through to Firecrawl */
  }
  return scrapeUrl(url);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden: employer access required' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid body' }, { status: 400 });
  }

  const created: { id: string; title: string }[] = [];
  const errors: { source: string; error: string }[] = [];

  const { jobUrls, careersPageUrl, careersPageRawText } = parsed.data;

  if (jobUrls?.length) {
    for (const url of jobUrls) {
      const text = await fetchTextFromUrl(url);
      if (!text || text.length < 50) {
        errors.push({ source: url, error: 'Could not fetch or not enough text (try pasting the description).' });
        continue;
      }
      const extracted = await parseJobFromText(text);
      if (!extracted) {
        errors.push({ source: url, error: 'AI could not parse this posting.' });
        continue;
      }
      const suffix = `\n\n---\nImported from: ${url}`;
      const job = await prisma.job.create({
        data: {
          employerId: ctx.employerId,
          title: extracted.title,
          location: extracted.location ?? undefined,
          locationType: extracted.locationType ?? 'onsite',
          jobType: extracted.jobType ?? 'fulltime',
          salaryMin: extracted.salaryMin ?? undefined,
          salaryMax: extracted.salaryMax ?? undefined,
          description: `${extracted.description}${suffix}`,
          requirements: extracted.requirements ?? [],
          preferredCertifications: extracted.preferredCertifications ?? [],
          suggestedPrograms: extracted.suggestedPrograms ?? [],
          status: 'draft',
        },
      });
      created.push({ id: job.id, title: job.title });
    }
  }

  let listingsText = careersPageRawText?.trim() ?? '';
  if (careersPageUrl && !listingsText) {
    const fetched = await fetchTextFromUrl(careersPageUrl);
    if (!fetched) {
      errors.push({ source: careersPageUrl, error: 'Could not fetch careers page. Paste the page text instead.' });
    } else {
      listingsText = fetched;
    }
  }

  if (listingsText.length >= 80) {
    const listings = await parseJobListingsFromPageText(listingsText);
    if (!listings?.length) {
      errors.push({ source: 'careers page', error: 'AI did not find separate job listings in that text.' });
    } else {
      const baseNote = careersPageUrl ? `\n\n---\nImported from careers page: ${careersPageUrl}` : '';
      for (const L of listings) {
        const urlNote = L.sourceUrl ? `\nJob link: ${L.sourceUrl}` : '';
        const job = await prisma.job.create({
          data: {
            employerId: ctx.employerId,
            title: L.title.trim(),
            description: `${L.description.trim()}${urlNote}${baseNote}`,
            requirements: [],
            preferredCertifications: [],
            suggestedPrograms: [],
            status: 'draft',
          },
        });
        created.push({ id: job.id, title: job.title });
      }
    }
  }

  if (created.length === 0 && errors.length === 0) {
    return NextResponse.json({ error: 'Nothing to import. Check URLs or pasted text.' }, { status: 400 });
  }

  return NextResponse.json({ created, errors }, { status: 201 });
}
