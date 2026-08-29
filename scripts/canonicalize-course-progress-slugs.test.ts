import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { CourseProgressStatus } from '@prisma/client';

import { mergeCourseProgressCollision } from './canonicalize-course-progress-slugs';

const NOW = new Date('2026-08-29T12:00:00.000Z');

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'row-1',
    userId: 'user-1',
    programSlug: 'comptia-a-plus',
    courseSlug: 'course-1',
    courseId: null,
    status: CourseProgressStatus.IN_PROGRESS,
    percentComplete: 93,
    progressPct: 93,
    scoreScaled: null,
    scoreRaw: null,
    startedAt: NOW,
    completedAt: null,
    lastActivityAt: NOW,
    statementCount: 1,
    lastUpdatedAt: NOW,
    ...overrides,
  };
}

test('collision merge keeps explicit completion and monotonic facts', () => {
  const merged = mergeCourseProgressCollision(
    row({ id: 'canonical', programSlug: 'comptia-a-professional-certificate' }),
    row({
      id: 'alias',
      status: CourseProgressStatus.COMPLETED,
      percentComplete: 100,
      progressPct: 100,
      completedAt: new Date('2026-08-29T13:00:00.000Z'),
      statementCount: 2,
    }),
  );

  assert.equal(merged.status, CourseProgressStatus.COMPLETED);
  assert.equal(merged.percentComplete, 100);
  assert.equal(merged.progressPct, 100);
  assert.equal(merged.statementCount, 3);
});

test('apply path is serializable, compare guarded, and recomputes instead of max-merging rollups', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(path.join(here, 'canonicalize-course-progress-slugs.ts'), 'utf8');

  assert.match(source, /const dryRun = process\.argv\.includes\('--dry-run'\) \|\| !apply/);
  assert.match(source, /TransactionIsolationLevel\.Serializable/);
  assert.match(source, /lastUpdatedAt: target\.lastUpdatedAt/);
  assert.match(source, /lastUpdatedAt: source\.lastUpdatedAt/);
  assert.match(source, /if \(updated\.count !== 1\) throw new StaleBackfillRowError/);
  assert.match(source, /if \(deleted\.count !== 1\) throw new StaleBackfillRowError/);
  assert.match(source, /error\.code === 'P2034'/);
  assert.match(source, /refreshValidatedRollup/);
  assert.doesNotMatch(source, /coursesCompleted:\s*Math\.max/);
  assert.doesNotMatch(source, /averagePercent:\s*Math\.max/);
});
