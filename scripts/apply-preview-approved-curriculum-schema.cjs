#!/usr/bin/env node

const path = require('path');
const { spawnSync } = require('child_process');
const { assertSupabaseEnvironment } = require('./lib/supabase-project-guard.cjs');

const MIGRATION_NAME = '20260830123000_versioned_approved_coursera_curricula';
const EXPECTED_MAPPING_COUNT = 26;

function validatePreviewTarget(env = process.env) {
  const target = assertSupabaseEnvironment(env, {
    requireVercel: true,
    requireDirectUrl: true,
  });

  if (target.vercelEnv !== 'preview' || target.expected !== 'demo') {
    throw new Error('The approved-curriculum preview bootstrap is allowed only for Vercel Preview on the demo project.');
  }

  return target;
}

function executeMigration(target, options = {}) {
  const spawn = options.spawn || spawnSync;
  const cwd = options.cwd || process.cwd();
  const migrationPath = path.join(
    cwd,
    'prisma',
    'migrations',
    MIGRATION_NAME,
    'migration.sql'
  );
  const schemaPath = path.join(cwd, 'prisma', 'schema.prisma');
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const childEnv = {
    ...process.env,
    POSTGRES_PRISMA_URL: target.directDatabaseUrl,
    POSTGRES_URL_NON_POOLING: target.directDatabaseUrl,
  };

  const result = spawn(
    executable,
    ['prisma', 'db', 'execute', '--file', migrationPath, '--schema', schemaPath],
    {
      cwd,
      env: childEnv,
      shell: false,
      stdio: 'inherit',
    }
  );

  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Preview curriculum schema migration failed with status ${result.status ?? 1}.`);
  }
}

async function verifyPostconditions(target, PrismaClientCtor) {
  process.env.POSTGRES_PRISMA_URL = target.directDatabaseUrl;
  process.env.POSTGRES_URL_NON_POOLING = target.directDatabaseUrl;

  const PrismaClient = PrismaClientCtor || require('@prisma/client').PrismaClient;
  const prisma = new PrismaClient();

  try {
    const [state] = await prisma.$queryRawUnsafe(`
      SELECT
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'course_enrollments'
            AND column_name = 'curriculum_version'
            AND data_type = 'text'
            AND is_nullable = 'NO'
            AND column_default LIKE '%legacy-v1%'
        ) AS column_ready,
        EXISTS (
          SELECT 1
          FROM pg_class
          WHERE oid = to_regclass('public.coursera_curriculum_course_mappings')
            AND relrowsecurity
        ) AS mapping_table_ready,
        (
          SELECT COUNT(*)::integer
          FROM public.coursera_curriculum_course_mappings
          WHERE curriculum_version = '2026-approved-v2'
        ) AS mapping_count
    `);

    if (
      !state ||
      state.column_ready !== true ||
      state.mapping_table_ready !== true ||
      state.mapping_count !== EXPECTED_MAPPING_COUNT
    ) {
      throw new Error('Preview curriculum schema postconditions were not satisfied.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const target = validatePreviewTarget(process.env);
  console.log('[preview-curriculum-schema] target verified: Vercel Preview + DEMO Supabase.');

  if (process.argv.includes('--check')) {
    console.log('[preview-curriculum-schema] guard check passed; no database command executed.');
    return;
  }

  executeMigration(target);
  await verifyPostconditions(target);
  console.log(`[preview-curriculum-schema] schema verified with ${EXPECTED_MAPPING_COUNT} approved mappings.`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[preview-curriculum-schema] BLOCKED: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  EXPECTED_MAPPING_COUNT,
  MIGRATION_NAME,
  executeMigration,
  main,
  validatePreviewTarget,
  verifyPostconditions,
};
