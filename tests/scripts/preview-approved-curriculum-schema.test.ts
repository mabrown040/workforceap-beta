import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const guard = require('../../scripts/lib/supabase-project-guard.cjs');
const previewDeploy = require('../../scripts/apply-preview-approved-curriculum-schema.cjs');
const vercelBuild = require('../../scripts/vercel-build.cjs');

const DEMO_PUBLIC = 'https://esbdrgaonplpvzmtrdhw.supabase.co';
const DEMO_POOLER =
  'postgresql://postgres.esbdrgaonplpvzmtrdhw:demo-secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
const DEMO_DIRECT =
  'postgresql://postgres:demo-secret@db.esbdrgaonplpvzmtrdhw.supabase.co:5432/postgres';
const PROD_PUBLIC = 'https://jqddnyuszufndwwezdwp.supabase.co';
const PROD_POOLER =
  'postgresql://postgres.jqddnyuszufndwwezdwp:prod-secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
const PROD_DIRECT =
  'postgresql://postgres:prod-secret@db.jqddnyuszufndwwezdwp.supabase.co:5432/postgres';

function vercelEnv(
  scope: 'preview' | 'development' | 'production',
  project: 'demo' | 'prod'
) {
  const isDemo = project === 'demo';
  return {
    VERCEL: '1',
    VERCEL_ENV: scope,
    NEXT_PUBLIC_SUPABASE_URL: isDemo ? DEMO_PUBLIC : PROD_PUBLIC,
    POSTGRES_PRISMA_URL: isDemo ? DEMO_POOLER : PROD_POOLER,
    POSTGRES_URL_NON_POOLING: isDemo ? DEMO_DIRECT : PROD_DIRECT,
    DATABASE_URL: '',
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Supabase project guard', () => {
  it.each([
    ['preview', 'demo', true],
    ['development', 'demo', true],
    ['production', 'prod', true],
    ['preview', 'prod', false],
    ['production', 'demo', false],
  ] as const)('%s with %s project has ok=%s', (scope, project, ok) => {
    const result = guard.inspectSupabaseEnvironment(vercelEnv(scope, project), {
      requireVercel: true,
      requireDirectUrl: true,
    });
    expect(result.ok).toBe(ok);
  });

  it('fails closed for missing and unrecognized Vercel URLs', () => {
    const missing = guard.inspectSupabaseEnvironment(
      { VERCEL: '1', VERCEL_ENV: 'preview' },
      { requireVercel: true, requireDirectUrl: true }
    );
    expect(missing.ok).toBe(false);
    expect(missing.errors.join(' ')).toContain('NEXT_PUBLIC_SUPABASE_URL is required');

    const unknown = guard.inspectSupabaseEnvironment(
      {
        ...vercelEnv('preview', 'demo'),
        POSTGRES_URL_NON_POOLING: 'postgresql://user:secret@example.com/db',
      },
      { requireVercel: true, requireDirectUrl: true }
    );
    expect(unknown.ok).toBe(false);
    expect(unknown.errors.join(' ')).toContain('does not identify an approved Supabase project');
  });

  it('does not trust an approved-looking pooler username on an attacker host', () => {
    const malicious =
      'postgresql://postgres.esbdrgaonplpvzmtrdhw:secret@evil.example/postgres';
    expect(guard.projectForUrl(malicious)).toBe('unknown');

    const result = guard.inspectSupabaseEnvironment(
      {
        ...vercelEnv('preview', 'demo'),
        POSTGRES_PRISMA_URL: malicious,
        POSTGRES_URL_NON_POOLING: malicious,
      },
      { requireVercel: true, requireDirectUrl: true }
    );
    expect(result.ok).toBe(false);
  });

  it('checks a set DATABASE_URL instead of ignoring an unsafe fallback', () => {
    const result = guard.inspectSupabaseEnvironment(
      {
        ...vercelEnv('preview', 'demo'),
        DATABASE_URL: PROD_DIRECT,
      },
      { requireVercel: true, requireDirectUrl: true }
    );
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('DATABASE_URL points at the wrong Supabase project');
  });

  it('does not let CI bypass the guard when VERCEL=1', () => {
    const result = spawnSync(process.execPath, ['scripts/check-supabase-env.mjs'], {
      cwd: path.resolve(__dirname, '../..'),
      env: {
        ...process.env,
        ...vercelEnv('preview', 'prod'),
        CI: 'true',
        GITHUB_ACTIONS: 'true',
      },
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).not.toContain('CI — skipping');
    expect(`${result.stdout}${result.stderr}`).not.toContain('prod-secret');
  });
});

describe('preview approved-curriculum schema bootstrap', () => {
  it('accepts only Vercel Preview wired entirely to demo', () => {
    expect(previewDeploy.validatePreviewTarget(vercelEnv('preview', 'demo')).expected).toBe(
      'demo'
    );
    expect(() => previewDeploy.validatePreviewTarget(vercelEnv('production', 'prod'))).toThrow(
      'allowed only for Vercel Preview'
    );
    expect(() =>
      previewDeploy.validatePreviewTarget({
        ...vercelEnv('preview', 'demo'),
        VERCEL: '0',
      })
    ).toThrow('allowed only during a Vercel deployment');
  });

  it('executes only the fixed migration with shell disabled and no URL argument', () => {
    const target = previewDeploy.validatePreviewTarget(vercelEnv('preview', 'demo'));
    const spawn = vi.fn(() => ({ status: 0 }));

    previewDeploy.executeMigration(target, {
      cwd: path.resolve(__dirname, '../..'),
      spawn,
    });

    expect(spawn).toHaveBeenCalledOnce();
    const calls = spawn.mock.calls as unknown as Array<
      [string, string[], { shell: boolean; env: Record<string, string> }]
    >;
    const [, args, options] = calls[0];
    expect(
      args.some((arg: string) =>
        arg.endsWith(previewDeploy.MIGRATION_NAME + path.sep + 'migration.sql')
      )
    ).toBe(true);
    expect(args.join(' ')).not.toContain('demo-secret');
    expect(options.shell).toBe(false);
    expect(options.env.POSTGRES_PRISMA_URL).toBe(DEMO_DIRECT);
    expect(options.env.POSTGRES_URL_NON_POOLING).toBe(DEMO_DIRECT);
  });

  it('propagates a child migration failure', () => {
    const target = previewDeploy.validatePreviewTarget(vercelEnv('preview', 'demo'));
    expect(() =>
      previewDeploy.executeMigration(target, {
        cwd: path.resolve(__dirname, '../..'),
        spawn: () => ({ status: 7 }),
      })
    ).toThrow('failed with status 7');
  });

  it('checks the post-commit schema and exact binding count', async () => {
    const disconnect = vi.fn();
    const query = vi.fn().mockResolvedValue([
      { column_ready: true, mapping_table_ready: true, mapping_count: 26 },
    ]);
    class FakePrismaClient {
      $queryRawUnsafe = query;
      $disconnect = disconnect;
    }

    await previewDeploy.verifyPostconditions(
      previewDeploy.validatePreviewTarget(vercelEnv('preview', 'demo')),
      FakePrismaClient
    );
    expect(query).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();

    query.mockResolvedValueOnce([
      { column_ready: true, mapping_table_ready: true, mapping_count: 25 },
    ]);
    await expect(
      previewDeploy.verifyPostconditions(
        previewDeploy.validatePreviewTarget(vercelEnv('preview', 'demo')),
        FakePrismaClient
      )
    ).rejects.toThrow('postconditions were not satisfied');
  });

  it('has a secret-free guard-only mode that never contacts the database', () => {
    const result = spawnSync(
      process.execPath,
      ['scripts/apply-preview-approved-curriculum-schema.cjs', '--check'],
      {
        cwd: path.resolve(__dirname, '../..'),
        env: {
          ...process.env,
          ...vercelEnv('preview', 'demo'),
        },
        encoding: 'utf8',
      }
    );

    expect(result.status).toBe(0);
    const output = `${result.stdout}${result.stderr}`;
    expect(output).toContain('no database command executed');
    expect(output).not.toContain('demo-secret');
  });
});

describe('approved-curriculum migration hardening', () => {
  it('is transactional, serialized, drift-checked, and commits last', async () => {
    const fs = await import('node:fs/promises');
    const sql = await fs.readFile(
      path.resolve(
        __dirname,
        '../../prisma/migrations',
        previewDeploy.MIGRATION_NAME,
        'migration.sql'
      ),
      'utf8'
    );

    expect(sql.trimStart().indexOf('BEGIN;')).toBeGreaterThan(0);
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain('stale or missing provider binding');
    expect(sql).toContain('expected 26 provider bindings');
    expect(sql.trimEnd().endsWith('COMMIT;')).toBe(true);
  });
});

describe('Vercel build routing', () => {
  it('keeps production on full migrations and preview on the guarded bootstrap', () => {
    expect(vercelBuild.appBuildScriptForEnvironment('production')).toBe('build:with-migrate');
    expect(vercelBuild.appBuildScriptForEnvironment('preview')).toBe('build:preview');
    expect(() => vercelBuild.appBuildScriptForEnvironment('development')).toThrow(
      'Unsupported VERCEL_ENV'
    );
    expect(() => vercelBuild.appBuildScriptForEnvironment('')).toThrow(
      'Unsupported VERCEL_ENV'
    );
  });

  it('uses a short Vercel command below the platform schema limit', async () => {
    const fs = await import('node:fs/promises');
    const repoRoot = path.resolve(__dirname, '../..');
    const config = JSON.parse(await fs.readFile(path.join(repoRoot, 'vercel.json'), 'utf8'));
    const pkg = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8'));

    expect(config.buildCommand).toBe('npm run build:vercel');
    expect(config.buildCommand.length).toBeLessThanOrEqual(256);
    expect(pkg.scripts['build:vercel']).toBe('node scripts/vercel-build.cjs');
  });

  it('validates routing without running marketing or application builds', () => {
    const repoRoot = path.resolve(__dirname, '../..');
    const preview = spawnSync(process.execPath, ['scripts/vercel-build.cjs', '--check'], {
      cwd: repoRoot,
      env: { ...process.env, VERCEL_ENV: 'preview' },
      encoding: 'utf8',
    });
    const production = spawnSync(process.execPath, ['scripts/vercel-build.cjs', '--check'], {
      cwd: repoRoot,
      env: { ...process.env, VERCEL_ENV: 'production' },
      encoding: 'utf8',
    });
    const unsupported = spawnSync(process.execPath, ['scripts/vercel-build.cjs', '--check'], {
      cwd: repoRoot,
      env: { ...process.env, VERCEL_ENV: 'development' },
      encoding: 'utf8',
    });

    expect(preview.status).toBe(0);
    expect(preview.stdout).toContain('app=build:preview');
    expect(production.status).toBe(0);
    expect(production.stdout).toContain('app=build:with-migrate');
    expect(unsupported.status).toBe(1);
  });

  it('propagates a child npm failure with shell disabled', () => {
    const spawn = vi.fn(() => ({ status: 9 }));
    expect(() => vercelBuild.runNpm(['run', 'build'], process.cwd(), spawn)).toThrow(
      'failed with status 9'
    );
    const calls = spawn.mock.calls as unknown as Array<
      [string, string[], { shell: boolean }]
    >;
    expect(calls[0][2].shell).toBe(false);
  });
});
