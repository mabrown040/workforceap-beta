import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { PROGRAMS } from '@/lib/content/programs';
import {
  getValidatedProgramCompletionSpec,
  hasValidatedProgramCompletion,
  isValidatedProgramComplete,
} from './programCompletion';

const sampleProgram = PROGRAMS.find((program) => program.courses.length >= 4);
if (!sampleProgram) throw new Error('test fixture: expected a program with at least four courses');

test('validated program completion requires exact X equals Y', () => {
  assert.equal(
    isValidatedProgramComplete(sampleProgram.slug, sampleProgram.courses.length),
    true,
  );
  assert.equal(
    isValidatedProgramComplete(sampleProgram.slug, sampleProgram.courses.length - 1),
    false,
  );
  assert.equal(
    isValidatedProgramComplete(sampleProgram.slug, sampleProgram.courses.length + 1),
    false,
  );
});

test('validated program completion resolves stored titles and legacy aliases', () => {
  const canonical = getValidatedProgramCompletionSpec(
    'data-analytics-professional-certificate-google',
  );
  const legacy = getValidatedProgramCompletionSpec(
    'management-and-data-analyst-professional-certificate-google-ibm',
  );
  const renamedTitle = getValidatedProgramCompletionSpec(
    'Management Analyst & Business Intelligence Professional Certificate',
  );

  assert.ok(canonical);
  assert.equal(legacy?.canonicalSlug, canonical.canonicalSlug);
  assert.equal(renamedTitle?.canonicalSlug, canonical.canonicalSlug);
});

test('an unrelated or partial progress row cannot certify the enrolled program', () => {
  const unrelatedProgram = PROGRAMS.find((program) => program.slug !== sampleProgram.slug);
  assert.ok(unrelatedProgram);
  assert.equal(
    hasValidatedProgramCompletion(sampleProgram.slug, [
      {
        programSlug: sampleProgram.slug,
        coursesCompleted: sampleProgram.courses.length - 1,
      },
      {
        programSlug: unrelatedProgram.slug,
        coursesCompleted: unrelatedProgram.courses.length,
      },
    ]),
    false,
  );
});

test('production-facing reports consume the shared completion policy, not percent shortcuts', () => {
  const sources = {
    board: readFileSync(path.join(process.cwd(), 'lib/admin/boardOutcomes.ts'), 'utf8'),
    publicImpact: readFileSync(
      path.join(process.cwd(), 'lib/marketing/publicImpactStats.ts'),
      'utf8',
    ),
    funder: readFileSync(path.join(process.cwd(), 'lib/admin/funderProgramMetrics.ts'), 'utf8'),
    analytics: readFileSync(path.join(process.cwd(), 'lib/admin/analytics.ts'), 'utf8'),
  };

  assert.match(sources.board, /validatedProgramCompletionValuesSql/);
  assert.match(sources.publicImpact, /validatedProgramCompletionValuesSql/);
  assert.match(sources.funder, /hasValidatedProgramCompletion/);
  assert.match(sources.analytics, /validatedProgramCompletionValuesSql/);

  for (const source of Object.values(sources)) {
    assert.doesNotMatch(source, /average_percent\s*>=\s*100/i);
    assert.doesNotMatch(source, /averagePercent:\s*\{\s*gte:\s*100/i);
    assert.doesNotMatch(source, /progress\.pct\s*>=\s*100/i);
  }
  assert.doesNotMatch(sources.analytics, /courses_completed\s*>\s*0/i);
});
