import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAMS } from '@/lib/content/programs';
import { buildAssignableProgramOptions } from './assignableProgramOptions';

test('bulk assignment choices come from the active catalog, not current-page enrollments', () => {
  const assignable = PROGRAMS.find((program) => !program.curriculumMigrationPending);
  const paused = PROGRAMS.find((program) => program.curriculumMigrationPending);

  assert.ok(assignable);
  assert.ok(paused);

  const result = buildAssignableProgramOptions([
    { slug: paused.slug },
    { slug: assignable.slug },
    { slug: assignable.slug },
    { slug: 'tenant-row-without-a-canonical-program' },
  ]);

  assert.deepEqual(result, [{ slug: assignable.slug, title: assignable.title }]);
});
