#!/usr/bin/env npx tsx
/**
 * End-to-end test: Rippling URL → scrape → parse → create draft jobs in DB.
 * Proves the full flow creates job records and returns them.
 *
 * Run: node scripts/prisma-env.js npx tsx scripts/test-import-e2e.ts
 * Requires: FIRECRAWL_API_KEY, GROQ_API_KEY, POSTGRES_* or DATABASE_URL, and an employer record.
 *
 * Uses first active employer from DB, or set TEST_EMPLOYER_ID=uuid to pick one.
 */
import { PrismaClient } from '@prisma/client';
import { scrapeUrl } from '../lib/firecrawl';
import { parseJobListingsFromPageText } from '../lib/ai/parseJob';

const RIPPLING_URL = 'https://ats.rippling.com/closinglock/jobs';

async function main() {
  const prisma = new PrismaClient();

  const employerId = process.env.TEST_EMPLOYER_ID ?? (await prisma.employer.findFirst({ where: { status: 'active' }, select: { id: true } }))?.id;
  if (!employerId) {
    console.error('No employer in DB. Create one first (e.g. npm run db:create-employer-michael-brown) or set TEST_EMPLOYER_ID.');
    process.exit(1);
  }
  console.log('Using employer:', employerId);

  if (!process.env.FIRECRAWL_API_KEY) {
    console.error('FIRECRAWL_API_KEY required');
    process.exit(1);
  }
  if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY required');
    process.exit(1);
  }

  console.log('1. Scraping', RIPPLING_URL);
  const text = await scrapeUrl(RIPPLING_URL);
  if (!text) {
    console.error('FAIL: No scraped text');
    process.exit(1);
  }
  console.log('   OK:', text.length, 'chars');

  console.log('2. Parsing listings');
  const listings = await parseJobListingsFromPageText(text);
  if (!listings?.length) {
    console.error('FAIL: No listings parsed');
    process.exit(1);
  }
  console.log('   OK:', listings.length, 'listings');

  console.log('3. Creating draft jobs');
  const created: { id: string; title: string }[] = [];
  const baseNote = `\n\n---\nImported from careers page: ${RIPPLING_URL}`;
  for (const L of listings.slice(0, 5)) {
    const urlNote = L.sourceUrl ? `\nJob link: ${L.sourceUrl}` : '';
    const job = await prisma.job.create({
      data: {
        employerId,
        title: L.title.trim(),
        description: `${L.description.trim()}${urlNote}${baseNote}`,
        requirements: [],
        preferredCertifications: [],
        suggestedPrograms: [],
        status: 'draft',
      },
    });
    created.push({ id: job.id, title: job.title });
    console.log('   -', job.title);
  }

  console.log('\nPASS: Created', created.length, 'draft job(s)');
  console.log('Sample:', created[0]);
  console.log('\nThese appear as pending/draft cards on Employer → My Jobs.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
