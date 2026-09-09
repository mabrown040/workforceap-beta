import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const bootstrap = require('../../scripts/apply-preview-training-workspace-schema.cjs');
const root = path.resolve(__dirname, '../..');
const DEMO_DIRECT = 'postgresql://postgres:fixture-secret@db.esbdrgaonplpvzmtrdhw.supabase.co:5432/postgres';
const env = {
  VERCEL: '1', VERCEL_ENV: 'preview',
  NEXT_PUBLIC_SUPABASE_URL: 'https://esbdrgaonplpvzmtrdhw.supabase.co',
  POSTGRES_PRISMA_URL: 'postgresql://postgres.esbdrgaonplpvzmtrdhw:fixture-secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
  POSTGRES_URL_NON_POOLING: DEMO_DIRECT,
};

function readyState() {
  const tables = ['training_study_plans', 'training_course_work'];
  const columns = tables.flatMap((table) => Object.entries({
    id: 'text', user_id: 'text', program_slug: 'text', curriculum_version: 'text', created_at: 'timestamp without time zone', updated_at: 'timestamp without time zone',
    ...(table === 'training_study_plans' ? { weekly_hours: 'integer', plan_start_date: 'date' } : { course_slug: 'text', notes: 'text', artifact_url: 'character varying' }),
  }).map(([name, type]) => ({ table, name, type, nullable: name === 'artifact_url' ? 'YES' : 'NO', maxLength: name === 'artifact_url' ? 2000 : null })));
  return {
    tables: tables.map((name) => ({ name, rls: true })), columns,
    indexes: tables.flatMap((table) => [
      { table, definition: `CREATE UNIQUE INDEX fixture_unique ON public.${table} USING btree (user_id, program_slug, curriculum_version${table === 'training_course_work' ? ', course_slug' : ''})` },
      { table, definition: `CREATE INDEX fixture_user ON public.${table} USING btree (user_id)` },
    ]),
    constraints: tables.flatMap((table) => [
      { table, type: 'p', definition: 'PRIMARY KEY (id)' },
      { table, type: 'f', definition: 'FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE' },
      { table, type: 'c', definition: table === 'training_study_plans' ? 'CHECK (((weekly_hours >= 1) AND (weekly_hours <= 40)))' : 'CHECK ((char_length(notes) <= 10000))' },
    ]),
    policies: tables.map((table) => ({ table, cmd: 'ALL', qual: "(user_id = NULLIF(current_setting('app.current_user_id'::text, true), ''::text))", check: "(user_id = NULLIF(current_setting('app.current_user_id'::text, true), ''::text))" })),
  };
}

function fakeClient(states: unknown[]) {
  const query = vi.fn(); states.forEach((state) => query.mockResolvedValueOnce([{ state }]));
  const disconnect = vi.fn();
  class Client { $queryRawUnsafe = query; $disconnect = disconnect; }
  return { Client, query, disconnect };
}

describe('training workspace preview bootstrap', () => {
  it('accepts only Vercel preview with a validated direct DEMO target', () => {
    expect(bootstrap.validatePreviewTarget(env).directDatabaseUrl).toBe(DEMO_DIRECT);
    for (const change of [
      { VERCEL: '0' }, { VERCEL_ENV: 'development' }, { VERCEL_ENV: 'production' },
      { POSTGRES_URL_NON_POOLING: '' },
      { POSTGRES_URL_NON_POOLING: 'postgresql://postgres:fixture-secret@db.jqddnyuszufndwwezdwp.supabase.co:5432/postgres' },
      { POSTGRES_URL_NON_POOLING: 'postgresql://postgres.esbdrgaonplpvzmtrdhw:fixture-secret@evil.example/db' },
    ]) expect(() => bootstrap.validatePreviewTarget({ ...env, ...change })).toThrow();
  });

  it('has a secret-free check mode that does not connect to the database', () => {
    const result = spawnSync(process.execPath, ['scripts/apply-preview-training-workspace-schema.cjs', '--check'], { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('no database command executed');
    expect(`${result.stdout}${result.stderr}`).not.toContain('fixture-secret');
  });

  it('runs only the fixed additive migration using the direct connection with no shell', () => {
    const spawn = vi.fn(() => ({ status: 0 }));
    bootstrap.executeMigration(bootstrap.validatePreviewTarget(env), { cwd: root, spawn });
    const [, args, options] = spawn.mock.calls[0] as unknown as [string, string[], any];
    expect(args.join(' ')).toContain(bootstrap.MIGRATION_NAME);
    expect(args).not.toContain('deploy');
    expect(args.join(' ')).not.toContain('fixture-secret');
    expect(options.shell).toBe(false);
    expect(options.env.POSTGRES_PRISMA_URL).toBe(DEMO_DIRECT);
  });

  it('skips an already verified schema without issuing a mutation', async () => {
    const db = fakeClient([readyState()]); const execute = vi.fn();
    await expect(bootstrap.ensurePreviewSchema(bootstrap.validatePreviewTarget(env), { PrismaClient: db.Client, execute })).resolves.toEqual({ applied: false });
    expect(execute).not.toHaveBeenCalled(); expect(db.disconnect).toHaveBeenCalledOnce();
  });

  it('applies absent tables once and verifies the resulting schema', async () => {
    const db = fakeClient([{ tables: [], columns: [], indexes: [], constraints: [], policies: [] }, readyState()]); const execute = vi.fn();
    await expect(bootstrap.ensurePreviewSchema(bootstrap.validatePreviewTarget(env), { PrismaClient: db.Client, execute })).resolves.toEqual({ applied: true });
    expect(execute).toHaveBeenCalledOnce(); expect(db.query).toHaveBeenCalledTimes(2);
  });

  it.each(['missing table', 'missing index', 'wrong column', 'missing RLS', 'broad policy', 'extra policy', 'missing FK', 'missing bounds'])('rejects %s before mutation', async (problem) => {
    const state = readyState();
    if (problem === 'missing table') state.tables.pop();
    if (problem === 'missing index') state.indexes.pop();
    if (problem === 'wrong column') state.columns[0].type = 'integer';
    if (problem === 'missing RLS') state.tables[0].rls = false;
    if (problem === 'broad policy') state.policies[0].qual = 'true';
    if (problem === 'extra policy') state.policies.push({ ...state.policies[0], qual: 'true' });
    if (problem === 'missing FK') state.constraints = state.constraints.filter((row) => row.type !== 'f');
    if (problem === 'missing bounds') state.constraints = state.constraints.filter((row) => row.type !== 'c');
    const db = fakeClient([state]); const execute = vi.fn();
    await expect(bootstrap.ensurePreviewSchema(bootstrap.validatePreviewTarget(env), { PrismaClient: db.Client, execute })).rejects.toThrow('partial or mismatched');
    expect(execute).not.toHaveBeenCalled(); expect(db.disconnect).toHaveBeenCalledOnce();
  });

  it('fails if migration execution succeeds but postconditions do not', async () => {
    const db = fakeClient([{ tables: [] }, { tables: [] }]);
    await expect(bootstrap.ensurePreviewSchema(bootstrap.validatePreviewTarget(env), { PrismaClient: db.Client, execute: vi.fn() })).rejects.toThrow('postconditions');
  });

  it('keeps the migration transactional and serialized for concurrent preview builds', () => {
    const sql = readFileSync(path.join(root, 'prisma/migrations', bootstrap.MIGRATION_NAME, 'migration.sql'), 'utf8');
    expect(sql).toContain('BEGIN;'); expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS'); expect(sql.trimEnd()).toMatch(/COMMIT;$/);
    expect(sql).toContain("current_setting('app.current_user_id', true)");
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.scripts['build:preview']).toContain('apply-preview-training-workspace-schema.cjs');
    expect(pkg.scripts['build:with-migrate']).not.toContain('apply-preview-training-workspace-schema.cjs');
  });
});
