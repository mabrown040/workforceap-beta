#!/usr/bin/env node

const path = require('path');
const { readFileSync } = require('fs');
const { createHash } = require('crypto');
const { spawnSync } = require('child_process');
const { validatePreviewTarget } = require('./apply-preview-training-workspace-schema.cjs');

const MIGRATION_NAME = '20260909130000_member_lab_evidence';
const CONTRACT_PATH = path.join(__dirname, 'lib', 'member-lab-schema-contract.json');
const STATE_KEYS = ['tables', 'columns', 'indexes', 'constraints', 'policies', 'functions', 'triggers'];

function migrationPath(cwd = path.resolve(__dirname, '..')) {
  return path.join(cwd, 'prisma', 'migrations', MIGRATION_NAME, 'migration.sql');
}

function loadContract(cwd) {
  const contract = JSON.parse(readFileSync(CONTRACT_PATH, 'utf8'));
  const hash = createHash('sha256').update(readFileSync(migrationPath(cwd))).digest('hex');
  if (contract.migration !== MIGRATION_NAME || contract.migrationSha256 !== hash) {
    throw new Error('Member-lab migration and verified schema contract differ; refusing to continue.');
  }
  return contract.schema;
}

function executeMigration(target, options = {}) {
  const cwd = options.cwd || path.resolve(__dirname, '..');
  loadContract(cwd);
  const spawn = options.spawn || spawnSync;
  const result = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', [
    'prisma', 'db', 'execute', '--file', migrationPath(cwd),
    '--schema', path.join(cwd, 'prisma', 'schema.prisma'),
  ], {
    cwd, shell: false, stdio: 'pipe', encoding: 'utf8', timeout: 120000,
    env: { ...process.env, POSTGRES_PRISMA_URL: target.directDatabaseUrl, POSTGRES_URL_NON_POOLING: target.directDatabaseUrl },
  });
  // Driver/CLI diagnostics can contain connection details. Never inherit or print them.
  if (result.error || (result.status ?? 1) !== 0) throw new Error('Preview member-lab migration failed.');
}

async function readSchemaState(prisma) {
  const [row] = await prisma.$queryRawUnsafe(`
    WITH targets AS (
      SELECT c.oid, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN ('member_lab_drafts', 'member_lab_submissions', 'member_lab_reviews')
    )
    SELECT json_build_object(
      'tables', COALESCE((SELECT json_agg(json_build_object(
        'name', relname, 'kind', relkind, 'rls', relrowsecurity, 'forceRls', relforcerowsecurity)) FROM targets), '[]'::json),
      'columns', COALESCE((SELECT json_agg(json_build_object(
        'table', t.relname, 'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
        'notNull', a.attnotnull, 'identity', a.attidentity, 'generated', a.attgenerated,
        'default', pg_get_expr(d.adbin, d.adrelid)))
        FROM targets t JOIN pg_attribute a ON a.attrelid = t.oid
        LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE a.attnum > 0 AND NOT a.attisdropped), '[]'::json),
      'indexes', COALESCE((SELECT json_agg(json_build_object(
        'table', t.relname, 'name', idx.relname, 'definition', pg_get_indexdef(i.indexrelid),
        'valid', i.indisvalid, 'ready', i.indisready, 'unique', i.indisunique))
        FROM targets t JOIN pg_index i ON i.indrelid = t.oid JOIN pg_class idx ON idx.oid = i.indexrelid), '[]'::json),
      'constraints', COALESCE((SELECT json_agg(json_build_object(
        'table', t.relname, 'name', c.conname, 'type', c.contype, 'definition', pg_get_constraintdef(c.oid),
        'validated', c.convalidated, 'deferrable', c.condeferrable, 'initiallyDeferred', c.condeferred))
        FROM targets t JOIN pg_constraint c ON c.conrelid = t.oid), '[]'::json),
      'policies', COALESCE((SELECT json_agg(json_build_object(
        'table', tablename, 'name', policyname, 'command', cmd, 'roles', roles,
        'permissive', permissive, 'using', qual, 'check', with_check))
        FROM pg_policies WHERE schemaname = 'public'
          AND tablename IN ('member_lab_drafts', 'member_lab_submissions', 'member_lab_reviews')), '[]'::json),
      'functions', COALESCE((SELECT json_agg(json_build_object(
        'name', p.proname, 'arguments', pg_get_function_arguments(p.oid),
        'result', pg_get_function_result(p.oid), 'language', l.lanname,
        'definer', p.prosecdef, 'volatility', p.provolatile, 'strict', p.proisstrict,
        'leakproof', p.proleakproof, 'parallel', p.proparallel,
        'config', p.proconfig, 'body', p.prosrc))
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace JOIN pg_language l ON l.oid = p.prolang
        WHERE n.nspname = 'public' AND p.proname IN ('lab_actor_is_member', 'lab_actor_can_review', 'reject_lab_evidence_update')), '[]'::json),
      'triggers', COALESCE((SELECT json_agg(json_build_object(
        'table', t.relname, 'name', g.tgname, 'enabled', g.tgenabled,
        'definition', pg_get_triggerdef(g.oid), 'functionSchema', fn.nspname, 'functionName', f.proname))
        FROM targets t JOIN pg_trigger g ON g.tgrelid = t.oid
        JOIN pg_proc f ON f.oid = g.tgfoid JOIN pg_namespace fn ON fn.oid = f.pronamespace
        WHERE NOT g.tgisinternal), '[]'::json)
    ) AS state
  `);
  return row?.state;
}

// Ignore SQL formatting while preserving quoted identifiers and literal contents.
function normalizeSql(value) {
  if (value === null) return null;
  return String(value).match(/'(?:''|[^'])*'|"(?:""|[^"])*"|[^\s'"]+|\s+/g)
    ?.filter((token) => !/^\s+$/.test(token)).join('') ?? '';
}

function normalizedState(state) {
  if (!state || Object.keys(state).sort().join(',') !== [...STATE_KEYS].sort().join(',')) return null;
  const sqlKeys = new Set(['definition', 'default', 'using', 'check', 'body', 'arguments']);
  const result = {};
  for (const key of STATE_KEYS) {
    if (!Array.isArray(state[key])) return null;
    result[key] = state[key].map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Invalid schema metadata.');
      return Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)).map(([field, value]) => [
        field, sqlKeys.has(field) ? normalizeSql(value) : Array.isArray(value) ? [...value].sort() : value,
      ]));
    }).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  return result;
}

function schemaReady(state, expected = loadContract()) {
  try {
    const actual = normalizedState(state);
    return actual !== null && JSON.stringify(actual) === JSON.stringify(normalizedState(expected));
  } catch { return false; }
}

function schemaAbsent(state) {
  return normalizedState(state) !== null && STATE_KEYS.every((key) => state[key].length === 0);
}

async function ensurePreviewSchema(target, options = {}) {
  const expected = loadContract(options.cwd);
  const PrismaClient = options.PrismaClient || require('@prisma/client').PrismaClient;
  const prisma = new PrismaClient({ datasources: { db: { url: target.directDatabaseUrl } } });
  try {
    const before = await readSchemaState(prisma);
    if (schemaReady(before, expected)) return { applied: false };
    if (!schemaAbsent(before)) throw new Error('Member-lab schema is partial or mismatched; refusing to alter it.');
    try {
      await (options.execute || executeMigration)(target, options);
    } catch {
      // Another preview can win the migration's advisory lock after our initial read.
      // Accept only its fully verified result; never repair a failed/partial migration.
      if (schemaReady(await readSchemaState(prisma), expected)) return { applied: false };
      throw new Error('Preview member-lab migration failed and schema is not verified.');
    }
    if (!schemaReady(await readSchemaState(prisma), expected)) throw new Error('Member-lab schema postconditions were not satisfied.');
    return { applied: true };
  } finally { await prisma.$disconnect(); }
}

async function main() {
  const target = validatePreviewTarget();
  console.log('[preview-member-labs] target verified: Vercel Preview + DEMO Supabase.');
  if (process.argv.includes('--check')) {
    loadContract();
    console.log('[preview-member-labs] target and migration contract verified; no database command executed.');
    return;
  }
  const result = await ensurePreviewSchema(target);
  console.log(`[preview-member-labs] schema verified (${result.applied ? 'applied' : 'already present'}).`);
}

if (require.main === module) main().catch(() => {
  console.error('[preview-member-labs] BLOCKED: target guard or schema verification failed.');
  process.exitCode = 1;
});

module.exports = { MIGRATION_NAME, STATE_KEYS, validatePreviewTarget, executeMigration, readSchemaState, normalizeSql, loadContract, schemaReady, schemaAbsent, ensurePreviewSchema, main };
