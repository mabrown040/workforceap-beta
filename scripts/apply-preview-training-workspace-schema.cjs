#!/usr/bin/env node

const path = require('path');
const { spawnSync } = require('child_process');
const { assertSupabaseEnvironment } = require('./lib/supabase-project-guard.cjs');

const MIGRATION_NAME = '20260909023000_member_training_workspace';
const TABLES = ['training_study_plans', 'training_course_work'];
const COMMON_COLUMNS = { id: 'text', user_id: 'text', program_slug: 'text', curriculum_version: 'text', created_at: 'timestamp without time zone', updated_at: 'timestamp without time zone' };
const COLUMNS = {
  training_study_plans: { ...COMMON_COLUMNS, weekly_hours: 'integer', plan_start_date: 'date' },
  training_course_work: { ...COMMON_COLUMNS, course_slug: 'text', notes: 'text', artifact_url: 'character varying' },
};
const EXPECTED_UNIQUE = {
  training_study_plans: 'user_id,program_slug,curriculum_version',
  training_course_work: 'user_id,program_slug,curriculum_version,course_slug',
};

function validatePreviewTarget(env = process.env) {
  const target = assertSupabaseEnvironment(env, { requireVercel: true, requireDirectUrl: true });
  if (target.vercelEnv !== 'preview' || target.expected !== 'demo') {
    throw new Error('The training-workspace bootstrap is allowed only for Vercel Preview on the demo project.');
  }
  return target;
}

function executeMigration(target, options = {}) {
  const spawn = options.spawn || spawnSync;
  const cwd = options.cwd || process.cwd();
  const result = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', [
    'prisma', 'db', 'execute', '--file', path.join(cwd, 'prisma', 'migrations', MIGRATION_NAME, 'migration.sql'),
    '--schema', path.join(cwd, 'prisma', 'schema.prisma'),
  ], {
    cwd, shell: false, stdio: 'inherit',
    env: { ...process.env, POSTGRES_PRISMA_URL: target.directDatabaseUrl, POSTGRES_URL_NON_POOLING: target.directDatabaseUrl },
  });
  if (result.error || (result.status ?? 1) !== 0) throw new Error('Preview training-workspace schema migration failed.');
}

async function readSchemaState(prisma) {
  const [result] = await prisma.$queryRawUnsafe(`
    SELECT json_build_object(
      'tables', COALESCE((SELECT json_agg(json_build_object('name', relname, 'rls', relrowsecurity))
        FROM pg_class JOIN pg_namespace n ON n.oid = relnamespace
        WHERE n.nspname = 'public' AND relname IN ('training_study_plans', 'training_course_work') AND relkind = 'r'), '[]'::json),
      'columns', COALESCE((SELECT json_agg(json_build_object('table', table_name, 'name', column_name, 'type', data_type, 'nullable', is_nullable, 'maxLength', character_maximum_length))
        FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('training_study_plans', 'training_course_work')), '[]'::json),
      'indexes', COALESCE((SELECT json_agg(json_build_object('table', tablename, 'definition', indexdef))
        FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('training_study_plans', 'training_course_work')), '[]'::json),
      'constraints', COALESCE((SELECT json_agg(json_build_object('table', r.relname, 'type', c.contype, 'definition', pg_get_constraintdef(c.oid)))
        FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid JOIN pg_namespace n ON n.oid = r.relnamespace
        WHERE n.nspname = 'public' AND r.relname IN ('training_study_plans', 'training_course_work')), '[]'::json),
      'policies', COALESCE((SELECT json_agg(json_build_object('table', tablename, 'name', policyname, 'cmd', cmd, 'qual', qual, 'check', with_check))
        FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('training_study_plans', 'training_course_work')), '[]'::json)
    ) AS state
  `);
  return result?.state;
}

function compact(value) { return String(value ?? '').replace(/\s|"|::text|\(|\)/g, '').replace(/public\./g, '').toLowerCase(); }

function schemaReady(state) {
  if (!state || !Array.isArray(state.tables) || state.tables.length !== 2) return false;
  if (!['columns', 'indexes', 'constraints', 'policies'].every((key) => Array.isArray(state[key]))) return false;
  for (const table of TABLES) {
    if (!state.tables.some((row) => row.name === table && row.rls === true)) return false;
    for (const [name, type] of Object.entries(COLUMNS[table])) {
      const column = state.columns.find((row) => row.table === table && row.name === name);
      if (!column || column.type !== type || column.nullable !== (name === 'artifact_url' ? 'YES' : 'NO')) return false;
      if (name === 'artifact_url' && column.maxLength !== 2000) return false;
    }
    const indexes = state.indexes.filter((row) => row.table === table).map((row) => compact(row.definition));
    if (!indexes.some((def) => def.startsWith('createuniqueindex') && def.endsWith(`usingbtree${EXPECTED_UNIQUE[table]}`))) return false;
    if (!indexes.some((def) => def.endsWith('usingbtreeuser_id'))) return false;
    const constraints = state.constraints.filter((row) => row.table === table);
    if (!constraints.some((row) => row.type === 'p' && compact(row.definition) === 'primarykeyid')) return false;
    if (!constraints.some((row) => row.type === 'f' && compact(row.definition) === 'foreignkeyuser_idreferencesusersid onupdatecascadeondeletecascade'.replace(/ /g, ''))) return false;
    const checks = constraints.filter((row) => row.type === 'c').map((row) => compact(row.definition));
    if (table === 'training_study_plans' && !checks.some((def) => def === 'checkweekly_hours>=1andweekly_hours<=40')) return false;
    if (table === 'training_course_work' && !checks.some((def) => def === 'checkchar_lengthnotes<=10000')) return false;
    const policies = state.policies.filter((row) => row.table === table);
    const ownExpression = "user_id=nullifcurrent_setting'app.current_user_id',true,''";
    if (policies.length !== 1 || policies[0].cmd !== 'ALL' || compact(policies[0].qual) !== ownExpression || compact(policies[0].check) !== ownExpression) return false;
  }
  return true;
}

async function ensurePreviewSchema(target, options = {}) {
  const PrismaClient = options.PrismaClient || require('@prisma/client').PrismaClient;
  const prisma = new PrismaClient({ datasources: { db: { url: target.directDatabaseUrl } } });
  try {
    const before = await readSchemaState(prisma);
    if (schemaReady(before)) return { applied: false };
    if (!before || before.tables.length !== 0) throw new Error('Training-workspace schema is partial or mismatched; refusing to alter it.');
    (options.execute || executeMigration)(target);
    if (!schemaReady(await readSchemaState(prisma))) throw new Error('Training-workspace schema postconditions were not satisfied.');
    return { applied: true };
  } finally { await prisma.$disconnect(); }
}

async function main() {
  const target = validatePreviewTarget();
  console.log('[preview-training-workspace] target verified: Vercel Preview + DEMO Supabase.');
  if (process.argv.includes('--check')) {
    console.log('[preview-training-workspace] guard check passed; no database command executed.');
    return;
  }
  const result = await ensurePreviewSchema(target);
  console.log(`[preview-training-workspace] schema verified (${result.applied ? 'applied' : 'already present'}).`);
}

if (require.main === module) main().catch(() => {
  // No connection URLs or raw driver errors in deployment output.
  console.error('[preview-training-workspace] BLOCKED: target guard or schema verification failed.');
  process.exitCode = 1;
});

module.exports = { MIGRATION_NAME, validatePreviewTarget, executeMigration, readSchemaState, schemaReady, ensurePreviewSchema, main };
