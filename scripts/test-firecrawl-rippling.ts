#!/usr/bin/env npx tsx
/**
 * Test Firecrawl + AI parse for https://ats.rippling.com/closinglock/jobs
 * Run: node scripts/prisma-env.js npx tsx scripts/test-firecrawl-rippling.ts
 * Or: FIRECRAWL_API_KEY=fc-... GROQ_API_KEY=gsk_... npx tsx scripts/test-firecrawl-rippling.ts
 */
import { scrapeUrl } from '../lib/firecrawl';
import { parseJobListingsFromPageText } from '../lib/ai/parseJob';

const RIPPLING_URL = 'https://ats.rippling.com/closinglock/jobs';

async function main() {
  console.log('Testing Firecrawl + parse for', RIPPLING_URL);
  console.log('FIRECRAWL_API_KEY set:', !!process.env.FIRECRAWL_API_KEY);
  console.log('GROQ_API_KEY set:', !!process.env.GROQ_API_KEY);

  const text = await scrapeUrl(RIPPLING_URL);
  if (!text) {
    console.error('FAIL: Firecrawl returned no text. Set FIRECRAWL_API_KEY.');
    process.exit(1);
  }
  console.log('OK: Scraped', text.length, 'chars');
  console.log('First 500 chars:', text.slice(0, 500));

  const listings = await parseJobListingsFromPageText(text);
  if (!listings?.length) {
    console.error('FAIL: AI returned no listings. Check GROQ_API_KEY and parseJob.');
    process.exit(1);
  }
  console.log('OK: Parsed', listings.length, 'jobs');
  listings.slice(0, 3).forEach((j, i) => {
    console.log(`  ${i + 1}. ${j.title} | ${j.sourceUrl ?? 'no url'}`);
  });
  console.log('PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
