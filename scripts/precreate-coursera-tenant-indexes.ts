/**
 * Attended preflight/pre-creation for the tenant-local Coursera raw indexes.
 *
 * Read-only by default. Mutation requires BOTH `--apply` and
 * `WAP_ALLOW_COURSERA_INDEX_PRECREATE=1`. This script never prints learner
 * identities or connection details.
 */
import { prisma } from '../lib/db/prisma';

type ExpectedIndex = {
  name: string;
  table: 'coursera_course_progress' | 'coursera_badge_progress';
  columns: [string, string, string];
  predicate: '' | 'organization_idISNOTNULL';
  createSql: string;
};

type IndexState = {
  indexName: string;
  tableName: string;
  valid: boolean;
  ready: boolean;
  unique: boolean;
  attributeCount: number;
  columns: string[];
  predicate: string;
};

const INDEXES: ExpectedIndex[] = [
  {
    name: 'coursera_course_progress_org_email_course_exact_key',
    table: 'coursera_course_progress',
    columns: ['organization_id', 'external_email', 'coursera_course_id'],
    predicate: '',
    createSql:
      'CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "coursera_course_progress_org_email_course_exact_key" ON "coursera_course_progress" ("organization_id", "external_email", "coursera_course_id")',
  },
  {
    name: 'coursera_course_progress_org_email_course_key',
    table: 'coursera_course_progress',
    columns: ['organization_id', 'lower(external_email)', 'coursera_course_id'],
    predicate: 'organization_idISNOTNULL',
    createSql:
      'CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "coursera_course_progress_org_email_course_key" ON "coursera_course_progress" ("organization_id", LOWER("external_email"), "coursera_course_id") WHERE "organization_id" IS NOT NULL',
  },
  {
    name: 'coursera_badge_progress_org_email_badge_exact_key',
    table: 'coursera_badge_progress',
    columns: ['organization_id', 'external_email', 'badge_slug'],
    predicate: '',
    createSql:
      'CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "coursera_badge_progress_org_email_badge_exact_key" ON "coursera_badge_progress" ("organization_id", "external_email", "badge_slug")',
  },
  {
    name: 'coursera_badge_progress_org_email_badge_key',
    table: 'coursera_badge_progress',
    columns: ['organization_id', 'lower(external_email)', 'badge_slug'],
    predicate: 'organization_idISNOTNULL',
    createSql:
      'CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "coursera_badge_progress_org_email_badge_key" ON "coursera_badge_progress" ("organization_id", LOWER("external_email"), "badge_slug") WHERE "organization_id" IS NOT NULL',
  },
];

async function loadIndexStates(): Promise<Map<string, IndexState>> {
  const rows = await prisma.$queryRaw<IndexState[]>`
    SELECT
      index_class.relname AS "indexName",
      table_class.relname AS "tableName",
      index_row.indisvalid AS valid,
      index_row.indisready AS ready,
      index_row.indisunique AS unique,
      index_row.indnatts::int AS "attributeCount",
      ARRAY[
        replace(pg_get_indexdef(index_row.indexrelid, 1, true), '"', ''),
        replace(pg_get_indexdef(index_row.indexrelid, 2, true), '"', ''),
        replace(pg_get_indexdef(index_row.indexrelid, 3, true), '"', '')
      ]::text[] AS columns,
      regexp_replace(
        COALESCE(pg_get_expr(index_row.indpred, index_row.indrelid, true), ''),
        '[()"[:space:]]',
        '',
        'g'
      ) AS predicate
    FROM pg_index AS index_row
    JOIN pg_class AS index_class ON index_class.oid = index_row.indexrelid
    JOIN pg_class AS table_class ON table_class.oid = index_row.indrelid
    JOIN pg_namespace AS table_namespace ON table_namespace.oid = table_class.relnamespace
    WHERE table_namespace.nspname = 'public'
      AND index_class.relname IN (
        'coursera_course_progress_org_email_course_exact_key',
        'coursera_course_progress_org_email_course_key',
        'coursera_badge_progress_org_email_badge_exact_key',
        'coursera_badge_progress_org_email_badge_key'
      )
  `;
  return new Map(rows.map((row) => [row.indexName, row]));
}

function matchesExpected(state: IndexState, expected: ExpectedIndex): boolean {
  return state.tableName === expected.table
    && state.valid
    && state.ready
    && state.unique
    && state.attributeCount === expected.columns.length
    && state.columns.length === expected.columns.length
    && state.columns.every((column, index) => column === expected.columns[index])
    && state.predicate === expected.predicate;
}

async function loadPreflight() {
  const duplicates = await prisma.$queryRaw<Array<{ key: string; groups: number }>>`
    SELECT 'course_exact'::text AS key, COUNT(*)::int AS groups
    FROM (
      SELECT organization_id, external_email, coursera_course_id
      FROM coursera_course_progress
      WHERE organization_id IS NOT NULL
      GROUP BY organization_id, external_email, coursera_course_id
      HAVING COUNT(*) > 1
    ) AS duplicate_groups
    UNION ALL
    SELECT 'course_lower'::text AS key, COUNT(*)::int AS groups
    FROM (
      SELECT organization_id, LOWER(external_email), coursera_course_id
      FROM coursera_course_progress
      WHERE organization_id IS NOT NULL
      GROUP BY organization_id, LOWER(external_email), coursera_course_id
      HAVING COUNT(*) > 1
    ) AS duplicate_groups
    UNION ALL
    SELECT 'badge_exact'::text AS key, COUNT(*)::int AS groups
    FROM (
      SELECT organization_id, external_email, badge_slug
      FROM coursera_badge_progress
      WHERE organization_id IS NOT NULL
      GROUP BY organization_id, external_email, badge_slug
      HAVING COUNT(*) > 1
    ) AS duplicate_groups
    UNION ALL
    SELECT 'badge_lower'::text AS key, COUNT(*)::int AS groups
    FROM (
      SELECT organization_id, LOWER(external_email), badge_slug
      FROM coursera_badge_progress
      WHERE organization_id IS NOT NULL
      GROUP BY organization_id, LOWER(external_email), badge_slug
      HAVING COUNT(*) > 1
    ) AS duplicate_groups
  `;

  const sizes = await prisma.$queryRaw<
    Array<{ tableName: string; estimatedRows: bigint; totalBytes: bigint }>
  >`
    SELECT
      table_class.relname AS "tableName",
      GREATEST(table_class.reltuples, 0)::bigint AS "estimatedRows",
      pg_total_relation_size(table_class.oid)::bigint AS "totalBytes"
    FROM pg_class AS table_class
    JOIN pg_namespace AS table_namespace ON table_namespace.oid = table_class.relnamespace
    WHERE table_namespace.nspname = 'public'
      AND table_class.relname IN ('coursera_course_progress', 'coursera_badge_progress')
    ORDER BY table_class.relname
  `;

  return {
    duplicates,
    sizes: sizes.map((row) => ({
      tableName: row.tableName,
      estimatedRows: row.estimatedRows.toString(),
      totalBytes: row.totalBytes.toString(),
    })),
  };
}

async function main() {
  const apply = process.argv.includes('--apply');
  if (apply && process.env.WAP_ALLOW_COURSERA_INDEX_PRECREATE !== '1') {
    throw new Error(
      'Refusing mutation: set WAP_ALLOW_COURSERA_INDEX_PRECREATE=1 with --apply in an attended session',
    );
  }

  const preflight = await loadPreflight();
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'read-only', ...preflight }, null, 2));
  if (preflight.duplicates.some((entry) => entry.groups > 0)) {
    throw new Error('Duplicate Coursera tenant key groups found; indexes were not created');
  }

  let states = await loadIndexStates();
  for (const expected of INDEXES) {
    const current = states.get(expected.name);
    if (current && !matchesExpected(current, expected)) {
      throw new Error(
        `Index ${expected.name} exists but is invalid, unready, non-unique, or has the wrong definition; inspect it and drop only that exact index concurrently before retrying`,
      );
    }
    if (current || !apply) continue;

    console.log(`Creating ${expected.name} concurrently...`);
    await prisma.$executeRawUnsafe(expected.createSql);
    states = await loadIndexStates();
    const created = states.get(expected.name);
    if (!created || !matchesExpected(created, expected)) {
      throw new Error(`Index ${expected.name} did not become valid with the exact expected definition`);
    }
  }

  const finalStates = await loadIndexStates();
  const verified = INDEXES.filter((expected) => {
    const state = finalStates.get(expected.name);
    return Boolean(state && matchesExpected(state, expected));
  }).map((expected) => expected.name);
  console.log(JSON.stringify({ verified, expected: INDEXES.length }, null, 2));

  if (apply && verified.length !== INDEXES.length) {
    throw new Error('Not all Coursera tenant indexes were installed and verified');
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Coursera index precreate failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
