import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'prisma/migrations/20260829160000_tenant_safe_coursera_progress_keys/migration.sql',
  ),
  'utf8',
);
const precreateScript = readFileSync(
  resolve(process.cwd(), 'scripts/precreate-coursera-tenant-indexes.ts'),
  'utf8',
);

const tenantIndexes = [
  'coursera_course_progress_org_email_course_exact_key',
  'coursera_course_progress_org_email_course_key',
  'coursera_badge_progress_org_email_badge_exact_key',
  'coursera_badge_progress_org_email_badge_key',
];

describe('tenant-safe Coursera index rollout', () => {
  it('keeps concurrent DDL out of the Prisma migration and validates every precreated index', () => {
    for (const indexName of tenantIndexes) {
      expect(migration).toContain(indexName);
    }
    expect(migration).not.toContain('CREATE UNIQUE INDEX CONCURRENTLY');
    expect(migration.match(/\bDO \$migration\$/g)).toHaveLength(1);
    expect(migration).toContain('IF table_has_rows THEN');
    expect(migration).toContain('coursera:precreate-tenant-indexes');
    expect(migration).toContain('Empty-database bootstrap only');
    expect(migration).toContain('index_row.indisvalid');
    expect(migration).toContain('index_row.indisready');
    expect(migration).toContain('index_row.indisunique');
    expect(migration).toContain('index_row.indnatts = 3');
    expect(migration).toContain('pg_get_indexdef');
  });

  it('keeps the serving deployment global indexes untouched', () => {
    expect(migration).not.toContain(
      'DROP INDEX CONCURRENTLY IF EXISTS "coursera_course_progress_email_course_key"',
    );
    expect(migration).not.toContain(
      'DROP INDEX CONCURRENTLY IF EXISTS "coursera_badge_progress_email_badge_key"',
    );
  });

  it('provides an attended, identity-free preflight and exact-definition verifier', () => {
    expect(precreateScript).toContain("process.argv.includes('--apply')");
    expect(precreateScript).toContain("WAP_ALLOW_COURSERA_INDEX_PRECREATE !== '1'");
    expect(precreateScript.match(/CREATE UNIQUE INDEX CONCURRENTLY/g)).toHaveLength(4);
    expect(precreateScript).toContain('index_row.indisvalid');
    expect(precreateScript).toContain('pg_get_indexdef');
    expect(precreateScript).toContain('HAVING COUNT(*) > 1');
    expect(precreateScript).not.toMatch(/[\w.+-]+@[\w.-]+/);
  });
});
