import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  APPROVED_CURRICULUM_VERSION,
  APPROVED_PROGRAM_CURRICULA,
} from '@/lib/content/programCurriculumManifest';

const REPO = join(__dirname, '..', '..');
const SCHEMA = readFileSync(join(REPO, 'prisma', 'schema.prisma'), 'utf8');
const MIGRATION = readFileSync(
  join(
    REPO,
    'prisma',
    'migrations',
    '20260830123000_versioned_approved_coursera_curricula',
    'migration.sql',
  ),
  'utf8',
);

describe('approved curriculum expand migration', () => {
  it('pins enrollment versions without changing the existing enrollment identity', () => {
    const enrollment = SCHEMA.match(/model CourseEnrollment \{[\s\S]*?\n\}/)?.[0] ?? '';
    assert.match(
      enrollment,
      /curriculumVersion\s+String\s+@default\("legacy-v1"\)\s+@map\("curriculum_version"\)/,
    );
    assert.match(enrollment, /@@unique\(\[userId,\s*programSlug\]\)/);
    assert.match(enrollment, /@@index\(\[programSlug,\s*curriculumVersion\]\)/);
  });

  it('adds a many-to-many versioned table while preserving the legacy mapping table', () => {
    const legacy = SCHEMA.match(/model CourseraCanonicalCourseMapping \{[\s\S]*?\n\}/)?.[0] ?? '';
    const versioned = SCHEMA.match(/model CourseraCurriculumCourseMapping \{[\s\S]*?\n\}/)?.[0] ?? '';
    assert.match(legacy, /courseraCourseId\s+String\s+@unique/);
    assert.match(versioned, /curriculumVersion\s+String/);
    assert.match(versioned, /id\s+String\s+@id\s+@default\(uuid\(\)\)\s+@db\.Uuid/);
    assert.match(
      versioned,
      /@@unique\(\[courseraCourseId,\s*canonicalProgramSlug,\s*curriculumVersion\]/,
    );
    assert.match(MIGRATION, /CREATE TABLE IF NOT EXISTS "coursera_curriculum_course_mappings"/);
    assert.doesNotMatch(MIGRATION, /ALTER TABLE "coursera_canonical_course_mappings"/);
    assert.doesNotMatch(MIGRATION, /DROP\s+(?:INDEX|TABLE)/i);
    assert.doesNotMatch(MIGRATION, /DELETE\s+FROM/i);
  });

  it('guards the immutable enrollment version at the database boundary', () => {
    assert.match(MIGRATION, /preserve_course_enrollment_curriculum_version/);
    assert.match(
      MIGRATION,
      /NEW\."curriculum_version" IS DISTINCT FROM OLD\."curriculum_version"/,
    );
    assert.match(MIGRATION, /BEFORE UPDATE ON "course_enrollments"/);
    assert.match(MIGRATION, /course_enrollments_curriculum_version_valid/);
    assert.match(
      MIGRATION,
      /CHECK \("curriculum_version" IN \('legacy-v1', 'catalog-v1', '2026-approved-v2'\)\)/,
    );
  });

  it('keeps the versioned provider catalog server-owned and append-only', () => {
    assert.match(
      MIGRATION,
      /ALTER TABLE "coursera_curriculum_course_mappings" ENABLE ROW LEVEL SECURITY/,
    );
    assert.match(MIGRATION, /BEFORE UPDATE OR DELETE ON "coursera_curriculum_course_mappings"/);
    assert.match(MIGRATION, /coursera_curriculum_mapping_version_valid/);
    assert.match(MIGRATION, /ON CONFLICT[\s\S]*DO NOTHING/);
    assert.doesNotMatch(MIGRATION, /ON CONFLICT[\s\S]*DO UPDATE SET/);
  });

  it('seeds every approved provider binding and no local lab mapping', () => {
    let providerBindingCount = 0;
    for (const manifest of APPROVED_PROGRAM_CURRICULA) {
      for (const course of manifest.courses) {
        if (course.kind === 'workforceap') {
          assert.equal(MIGRATION.includes(`'${course.slug}'`), false);
          continue;
        }
        providerBindingCount += 1;
        const expectedTuple = [
          `'${course.courseraCourseId}'`,
          `'${course.courseraSlug}'`,
          `'${manifest.programSlug}'`,
          `'${APPROVED_CURRICULUM_VERSION}'`,
          `'${course.slug}'`,
        ].join(', ');
        assert.ok(
          MIGRATION.includes(expectedTuple),
          `migration is missing ${manifest.programSlug}/${course.slug}`,
        );
      }
    }
    assert.equal(providerBindingCount, 26);
  });

  it('does not rewrite learner progress or aggregate history', () => {
    assert.doesNotMatch(MIGRATION, /(?:UPDATE|DELETE\s+FROM)\s+"course_progress"/i);
    assert.doesNotMatch(MIGRATION, /(?:UPDATE|DELETE\s+FROM)\s+"member_program_progress"/i);
    assert.doesNotMatch(MIGRATION, /(?:UPDATE|DELETE\s+FROM)\s+"coursera_course_progress"/i);
  });
});
