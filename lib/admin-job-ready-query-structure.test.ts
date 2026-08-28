import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(
  join(process.cwd(), 'lib/admin/jobReadyCandidates.ts'),
  'utf8',
);
const pageSource = readFileSync(
  join(process.cwd(), 'app/admin/members/job-ready/page.tsx'),
  'utf8',
);
const programsSource = readFileSync(
  join(process.cwd(), 'lib/content/programs.ts'),
  'utf8',
);

test('job-ready paging filters the current program before applying limit and offset', () => {
  assert.match(source, /u\.enrolled_program\s*=\s*mpp\.program_slug/);
  assert.match(source, /mpp\.average_percent\s*>=\s*\$\{args\.minimumPercent\}/);
  assert.match(source, /mpp\.program_slug\s*=\s*ANY\(\$\{args\.programStorageValues\}::text\[\]\)/);
  assert.match(source, /u\.organization_id\s*=\s*\$\{args\.organizationId\}/);
  assert.match(source, /ORDER BY[\s\S]*LIMIT \$\{args\.limit\}[\s\S]*OFFSET \$\{args\.offset\}/);
  assert.match(source, /args\.superAdmin \? crossTenantOK\(query\) : query\(\)/);
});

test('job-ready paging includes supported legacy enrollment slugs', () => {
  assert.match(pageSource, /programStorageValues: SUPPORTED_PROGRAM_STORAGE_VALUES/);
  assert.match(
    programsSource,
    /SUPPORTED_PROGRAM_STORAGE_VALUES[\s\S]{0,240}program\.slug, program\.title[\s\S]{0,160}Object\.keys\(PROGRAM_SLUG_ALIASES\)/,
  );
});
