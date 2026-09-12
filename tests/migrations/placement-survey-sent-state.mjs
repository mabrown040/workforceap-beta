/**
 * Isolated PostgreSQL proof for the unpublished placement-survey sent-state migration.
 * The caller must provide a dedicated disposable local database; production hosts and
 * generic database names are rejected before any SQL runs.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const migrationPath = 'prisma/migrations/20260912130000_placement_survey_nullable_sent_at/migration.sql';
const migration = readFileSync(migrationPath, 'utf8');
const sourceUrl = process.env.PLACEMENT_SURVEY_MIGRATION_PROOF_DATABASE_URL
  ?? process.env.SHADOW_DATABASE_URL
  ?? '';
const target = new URL(sourceUrl);
assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname), 'Proof database must be local.');
assert.equal(target.search, '', 'Connection options are not accepted.');
const sourceDatabase = decodeURIComponent(target.pathname.slice(1));
assert.ok(
  ['wap_placement_survey_migration_proof', 'wap_shadow'].includes(sourceDatabase),
  'Proof must use its dedicated database or the repository shadow database as a launcher.',
);
const proofDatabase = 'wap_placement_survey_migration_proof';
const createsDatabase = sourceDatabase !== proofDatabase;

const env = {
  ...process.env,
  PGHOST: target.hostname,
  PGPORT: target.port || '5432',
  PGUSER: decodeURIComponent(target.username),
  PGPASSWORD: decodeURIComponent(target.password),
  PGDATABASE: proofDatabase,
  PGCONNECT_TIMEOUT: '5',
};

function runSql(input, database = proofDatabase) {
  const result = spawnSync('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-d', database], {
    env,
    input: `\\set VERBOSITY sqlstate\n${input}`,
    encoding: 'utf8',
    timeout: 20_000,
  });
  assert.equal(result.status, 0, `PostgreSQL proof failed: ${(result.stderr ?? '').trim()}`);
  return result.stdout.trim();
}

const sql = (input) => runSql(input, proofDatabase);
const ident = (value) => `\"${String(value).replaceAll('\"', '\"\"')}\"`;
let proofDatabaseCreated = false;

function resetTable(rows = '') {
  sql(`
    DROP TABLE IF EXISTS public.placement_surveys;
    CREATE TABLE public.placement_surveys (
      id TEXT PRIMARY KEY,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ${rows}
  `);
}

function columnState() {
  return JSON.parse(sql(`
    SELECT json_build_object(
      'sentNullable', (SELECT is_nullable = 'YES' FROM information_schema.columns WHERE table_schema='public' AND table_name='placement_surveys' AND column_name='sent_at'),
      'sentDefault', (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='placement_surveys' AND column_name='sent_at'),
      'tokenNullable', (SELECT is_nullable = 'YES' FROM information_schema.columns WHERE table_schema='public' AND table_name='placement_surveys' AND column_name='token_expires_at'),
      'deliveryDefault', (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='placement_surveys' AND column_name='delivery_attempt'),
      'acceptedDefault', (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='placement_surveys' AND column_name='accepted_attempt'),
      'attemptConstraint', EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid='public.placement_surveys'::regclass
          AND conname='placement_surveys_attempt_order_check'
          AND contype='c'
      )
    );
  `));
}

function assertFollowOnColumns() {
  assert.deepEqual(columnState(), {
    sentNullable: true,
    sentDefault: null,
    tokenNullable: false,
    deliveryDefault: '1',
    acceptedDefault: '0',
    attemptConstraint: true,
  });
}

try {
  if (createsDatabase) {
    assert.equal(
      runSql(`SELECT count(*) FROM pg_database WHERE datname='${proofDatabase}';`, 'postgres'),
      '0',
      'Dedicated proof database must not already exist.',
    );
    runSql(`CREATE DATABASE ${ident(proofDatabase)};`, 'postgres');
    proofDatabaseCreated = true;
  }

  // Preimage 1: the historical epoch sentinel must migrate to truthful NULL.
  resetTable(`INSERT INTO public.placement_surveys(id, sent_at) VALUES ('epoch', TIMESTAMPTZ '1970-01-01 00:00:00+00');`);
  sql(migration);
  assert.deepEqual(JSON.parse(sql(`
    SELECT json_build_object(
      'sentAtIsNull', sent_at IS NULL,
      'tokenExpiresAtPresent', token_expires_at IS NOT NULL,
      'deliveryAttempt', delivery_attempt,
      'acceptedAttempt', accepted_attempt
    ) FROM public.placement_surveys WHERE id='epoch';
  `)), { sentAtIsNull: true, tokenExpiresAtPresent: true, deliveryAttempt: 1, acceptedAttempt: 0 });
  assertFollowOnColumns();
  console.log('PASS epoch sentinel becomes NULL after nullability is relaxed');

  // Preimage 2: an accepted timestamp remains unchanged and receives accepted state.
  const realTimestamp = '2026-09-01T12:34:56+00:00';
  resetTable(`INSERT INTO public.placement_surveys(id, sent_at) VALUES ('real', TIMESTAMPTZ '${realTimestamp}');`);
  sql(migration);
  assert.deepEqual(JSON.parse(sql(`
    SELECT json_build_object(
      'sentAt', to_char(sent_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'tokenExpiresAt', to_char(token_expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'deliveryAttempt', delivery_attempt,
      'acceptedAttempt', accepted_attempt
    ) FROM public.placement_surveys WHERE id='real';
  `)), {
    sentAt: '2026-09-01T12:34:56Z',
    tokenExpiresAt: '2026-10-31T12:34:56Z',
    deliveryAttempt: 1,
    acceptedAttempt: 1,
  });
  assertFollowOnColumns();
  console.log('PASS real sent timestamp remains unchanged and accepted');

  // Preimage 3: no rows is a valid migration state and all follow-on DDL lands.
  resetTable();
  sql(migration);
  assert.equal(sql('SELECT count(*) FROM public.placement_surveys;'), '0');
  assertFollowOnColumns();
  console.log('PASS empty placement_surveys table migrates successfully');
} finally {
  if (proofDatabaseCreated) {
    runSql(`DROP DATABASE ${ident(proofDatabase)};`, 'postgres');
  }
}
