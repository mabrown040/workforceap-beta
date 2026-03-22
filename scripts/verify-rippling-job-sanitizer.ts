import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildFallbackParsedJobFromScrape,
  extractLikelyJobTitleFromScrape,
  normalizeImportedParsedJob,
  sanitizeScrapedJobText,
} from '../lib/ai/parseJob';

const fixture = readFileSync(join(process.cwd(), 'scripts/fixtures/rippling-portal-chrome-scrape.txt'), 'utf8');

const cleaned = sanitizeScrapedJobText(fixture);
if (/body\{|@font-face|:root|--color-primary|font-family/i.test(cleaned)) {
  throw new Error('CSS noise still present after sanitizeScrapedJobText');
}
if (/Employer portal|Site home|Viewing as Talent Ops|Switch company|Job Postings|Applicants|Create Posting|Almost ready to send|Submit for Review|Sign out|Back to jobs/i.test(cleaned)) {
  throw new Error('Portal chrome still present after sanitizeScrapedJobText');
}
for (const phrase of ['technical support', 'support representative', 'customer advocate', 'basic html']) {
  if (!cleaned.toLowerCase().includes(phrase)) {
    throw new Error(`Expected sanitized text to preserve legitimate content: ${phrase}`);
  }
}

const title = extractLikelyJobTitleFromScrape(fixture);
if (title !== 'Customer Support Representative') {
  throw new Error(`Expected extracted title to be Customer Support Representative, got ${title ?? 'null'}`);
}

const parsed = buildFallbackParsedJobFromScrape(undefined, fixture);
if (!parsed) {
  throw new Error('Fallback parse returned null');
}

if (/body\{|@font-face|:root|--color-primary|font-family/i.test(parsed.description)) {
  throw new Error('Fallback description still contains CSS noise');
}

for (const phrase of ['technical support', 'support representative', 'customer advocate', 'basic html']) {
  if (!parsed.description.toLowerCase().includes(phrase)) {
    throw new Error(`Expected fallback description to preserve legitimate content: ${phrase}`);
  }
}
if (/Employer portal|Site home|Viewing as Talent Ops|Switch company|Job Postings|Applicants|Create Posting|Almost ready to send|Submit for Review|Sign out|Back to jobs/i.test(parsed.description)) {
  throw new Error('Fallback description still contains portal chrome');
}
if (!parsed.description.includes('Imported from:')) {
  throw new Error('Expected fallback description to preserve the Imported from footer label');
}
if (/Imported from:\s+https?:\/\//i.test(parsed.description)) {
  throw new Error('Expected fallback description to strip the Imported from URL from the saved draft body');
}

const normalized = normalizeImportedParsedJob({
  ...parsed,
  description: `${parsed.description}

https://ats.rippling.com/example/jobs/12345678-abcd-4321-abcd-1234567890ab`,
  requirements: ['  technical support  ', 'technical support'],
});

if (/https?:\/\//i.test(normalized.description)) {
  throw new Error('normalizeImportedParsedJob should strip raw URLs from description');
}

if ((normalized.requirements?.length ?? 0) !== 1) {
  throw new Error(`Expected normalized requirements to dedupe to 1 item, got ${normalized.requirements?.length ?? 0}`);
}

console.log(JSON.stringify({
  ok: true,
  title: parsed.title,
  excerpt: normalized.description.slice(0, 220),
}, null, 2));
