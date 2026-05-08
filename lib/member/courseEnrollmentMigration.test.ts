/**
 * Static checks for the multi-course-enrollment migration. We can't spin a
 * Postgres in CI, but we can pin the migration SQL surface and the schema
 * shape so accidental edits don't silently regress the (userId, programSlug)
 * unique or the partial-unique-on-primary invariant.
 *
 * Tests:
 *   1. Schema declares `isPrimary` and (userId, programSlug) composite unique
 *   2. Schema no longer has `userId String @unique`
 *   3. Migration SQL drops the old user_id unique
 *   4. Migration SQL adds the partial unique index `WHERE is_primary = true`
 *   5. Migration SQL adds the (user_id, program_slug) composite unique
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..');
const SCHEMA = readFileSync(join(REPO, 'prisma', 'schema.prisma'), 'utf8');
const MIGRATION = readFileSync(
  join(REPO, 'prisma', 'migrations', '20260508120000_multi_course_enrollment', 'migration.sql'),
  'utf8',
);

function extractCourseEnrollmentBlock(schema: string): string {
  const match = schema.match(/model CourseEnrollment \{[\s\S]*?\n\}/);
  assert.ok(match, 'CourseEnrollment model not found in schema.prisma');
  return match[0];
}

describe('CourseEnrollment schema', () => {
  const block = extractCourseEnrollmentBlock(SCHEMA);

  it('declares isPrimary boolean with default false', () => {
    assert.match(
      block,
      /isPrimary\s+Boolean\s+@default\(false\)\s+@map\("is_primary"\)/,
      'isPrimary field with proper default + db column missing',
    );
  });

  it('does NOT have userId @unique anymore', () => {
    // The old constraint was: `userId String @unique @map("user_id")`.
    // Multi-program migration drops it. Keep the negative assertion strict.
    assert.doesNotMatch(
      block,
      /userId\s+String\s+@unique/,
      'userId still has a single-column @unique — migration not applied to schema',
    );
  });

  it('has @@unique([userId, programSlug])', () => {
    assert.match(
      block,
      /@@unique\(\[userId,\s*programSlug\]\)/,
      'composite unique on (userId, programSlug) missing — duplicate-program guard gone',
    );
  });

  it('has helper @@index on (userId, isPrimary)', () => {
    assert.match(
      block,
      /@@index\(\[userId,\s*isPrimary\]\)/,
      'helper index on (userId, isPrimary) missing',
    );
  });
});

describe('multi_course_enrollment migration.sql', () => {
  it('adds the is_primary column with NOT NULL DEFAULT false', () => {
    assert.match(
      MIGRATION,
      /ADD COLUMN IF NOT EXISTS "is_primary" BOOLEAN NOT NULL DEFAULT false/,
    );
  });

  it('backfills existing rows to is_primary = true', () => {
    assert.match(
      MIGRATION,
      /UPDATE "course_enrollments"\s*\nSET "is_primary" = true\s*\nWHERE "is_primary" = false/,
      'backfill to is_primary = true missing — existing rows would have no primary',
    );
  });

  it('drops the old per-user unique constraint and index', () => {
    assert.match(MIGRATION, /DROP CONSTRAINT IF EXISTS "course_enrollments_user_id_key"/);
    assert.match(MIGRATION, /DROP INDEX IF EXISTS "course_enrollments_user_id_key"/);
  });

  it('adds the (user_id, program_slug) composite unique', () => {
    assert.match(
      MIGRATION,
      /UNIQUE \("user_id", "program_slug"\)/,
      'composite (user_id, program_slug) unique missing',
    );
  });

  it('adds a partial unique index for is_primary = true', () => {
    // This is the postgres-specific "at most one primary per user" guard.
    assert.match(
      MIGRATION,
      /CREATE UNIQUE INDEX IF NOT EXISTS "course_enrollments_user_primary_uidx"[\s\S]*?WHERE "is_primary" = true/,
      'partial unique index "course_enrollments_user_primary_uidx" missing or wrong predicate',
    );
  });

  it('adds the helper (user_id, is_primary) index for ordering', () => {
    assert.match(
      MIGRATION,
      /CREATE INDEX IF NOT EXISTS "course_enrollments_user_id_is_primary_idx"/,
    );
  });

  it('every DDL statement uses IF (NOT) EXISTS for idempotency', () => {
    // Strip block comments + line comments + the DO $$...$$ block (which has
    // its own NOT EXISTS guard inline). What remains should be a series of
    // statements, each terminated by `;`, each using IF (NOT) EXISTS when
    // it's a DDL command we care about.
    const stripped = MIGRATION
      .split('\n')
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n')
      .replace(/DO \$\$[\s\S]*?\$\$;/g, '');
    const stmts = stripped
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const ddl = stmts.filter((s) =>
      /^(ALTER TABLE|CREATE INDEX|CREATE UNIQUE INDEX|DROP CONSTRAINT|DROP INDEX|CREATE TABLE)\b/i.test(
        s,
      ),
    );
    for (const stmt of ddl) {
      assert.match(
        stmt,
        /IF (NOT )?EXISTS/i,
        `migration DDL not idempotent: ${stmt.slice(0, 80)}…`,
      );
    }
  });
});
