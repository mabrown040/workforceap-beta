import assert from 'node:assert/strict';
import test from 'node:test';

import { EMPLOYER_ROLE_SAMPLES } from '@/lib/test-fixtures/employerRoleSamples';
import {
  buildFallbackParsedJobFromScrape,
  normalizeCandidateUrl,
  normalizeImportedParsedJob,
  sanitizeScrapedJobText,
} from './parseJob';

test('sanitizeScrapedJobText strips rippling portal shell noise while preserving job copy', () => {
  const cleaned = sanitizeScrapedJobText(EMPLOYER_ROLE_SAMPLES.ripplingPortalShell);

  assert.ok(cleaned.includes('Customer Success Manager, Mid-Market'));
  assert.ok(cleaned.includes('Closinglock is hiring a Customer Success Manager'));
  assert.ok(!/Employer portal|Viewing as Test Employer|Sign out|Candidate pipeline|Review posting/i.test(cleaned));
  assert.ok(!/body\{|@font-face|:root|--color-primary|font-family/i.test(cleaned));
});

test('fallback parsed jobs keep cleaned posting text and strip imported portal URLs', () => {
  const parsed = buildFallbackParsedJobFromScrape(
    'Customer Success Manager, Mid-Market',
    EMPLOYER_ROLE_SAMPLES.ripplingPortalShell
  );

  assert.ok(parsed);
  assert.ok(parsed?.description.includes('Closinglock is hiring a Customer Success Manager'));
  assert.ok(parsed?.description.includes('Imported from:'));
  assert.ok(!/https?:\/\//i.test(parsed?.description ?? ''));
  assert.ok(!/Employer portal|Viewing as Test Employer|Sign out|Candidate pipeline/i.test(parsed?.description ?? ''));
});

test('normalizeImportedParsedJob removes leftover raw URLs after cleanup', () => {
  const normalized = normalizeImportedParsedJob({
    title: ' Customer Support Representative ',
    description: `${EMPLOYER_ROLE_SAMPLES.customerSupportRepresentative}

https://example.com/apply`,
    requirements: [' HTML email troubleshooting ', 'HTML email troubleshooting'],
  });

  assert.equal(normalized.title, 'Customer Support Representative');
  assert.ok(!/https?:\/\//i.test(normalized.description));
  assert.deepEqual(normalized.requirements, ['HTML email troubleshooting']);
});

test('normalizeCandidateUrl', async (t) => {
  await t.test('returns valid absolute URL', () => {
    assert.equal(
      normalizeCandidateUrl('https://example.com/jobs/123'),
      'https://example.com/jobs/123'
    );
  });

  await t.test('resolves relative URL with base URL', () => {
    assert.equal(
      normalizeCandidateUrl('/jobs/123', 'https://example.com'),
      'https://example.com/jobs/123'
    );
  });

  await t.test('returns null for malformed URL without base URL', () => {
    assert.equal(normalizeCandidateUrl('/jobs/123'), null);
    assert.equal(normalizeCandidateUrl('https://'), null);
    assert.equal(normalizeCandidateUrl('not-a-url'), null);
  });

  await t.test('strips tracking parameters', () => {
    assert.equal(
      normalizeCandidateUrl('https://example.com/jobs/123?utm_source=test&gh_src=123&valid=true'),
      'https://example.com/jobs/123?utm_source=test&valid=true'
    );
  });
});
