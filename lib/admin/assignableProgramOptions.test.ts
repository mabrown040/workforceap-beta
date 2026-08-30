import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAMS } from '@/lib/content/programs';
import {
  buildAssignableProgramOptions,
  buildMemberProgramOptions,
} from './assignableProgramOptions';

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

test('single-member choices hide paused curricula except the current enrollment', () => {
  const assignable = PROGRAMS.find((program) => !program.curriculumMigrationPending);
  const paused = PROGRAMS.find((program) => program.curriculumMigrationPending);

  assert.ok(assignable);
  assert.ok(paused);

  const catalog = [
    { slug: paused.slug, name: 'Tenant paused title', status: 'active' },
    { slug: assignable.slug, name: 'Tenant active title', status: 'active' },
    { slug: 'tenant-row-without-a-canonical-program', name: 'Unknown' },
  ];

  assert.deepEqual(buildMemberProgramOptions(catalog, null), [
    {
      slug: assignable.slug,
      name: 'Tenant active title',
      status: 'active',
      curriculumMigrationPending: false,
    },
  ]);

  assert.deepEqual(
    buildMemberProgramOptions(catalog, paused.slug).find((option) => option.slug === paused.slug),
    {
      slug: paused.slug,
      name: 'Tenant paused title',
      status: 'active',
      curriculumMigrationPending: true,
    },
  );
});

test('single-member choices hide inactive catalog rows except the current program', () => {
  const programs = PROGRAMS.filter((program) => !program.curriculumMigrationPending).slice(0, 2);
  assert.equal(programs.length, 2);

  const catalog = programs.map((program) => ({
    slug: program.slug,
    name: program.title,
    status: 'inactive',
  }));

  assert.deepEqual(buildMemberProgramOptions(catalog, null), []);
  assert.deepEqual(buildMemberProgramOptions(catalog, programs[0].slug), [
    {
      slug: programs[0].slug,
      name: programs[0].title,
      status: 'inactive',
      curriculumMigrationPending: false,
    },
  ]);
});
