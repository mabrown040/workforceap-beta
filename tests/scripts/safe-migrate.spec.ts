// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const source = readFileSync(path.resolve(__dirname, '../../scripts/safe-migrate.cjs'), 'utf8');

type ChildResult = { status: number | null; stdout?: string; stderr?: string };

// Run the real CLI with its process boundary replaced: no shell, credentials,
// environment files, or database are accessed by these recovery regressions.
function runCli({
  args = [],
  results = [],
  placeholder = false,
}: {
  args?: string[];
  results?: ChildResult[];
  placeholder?: boolean;
} = {}) {
  const calls: string[][] = [];
  const output: string[] = [];
  const exitSignal = {};
  let exitCode: number | undefined;
  const write = (...values: unknown[]) => { output.push(values.map(String).join(' ')); };

  try {
    runInNewContext(source, {
      require(name: string) {
        if (name === './ensure-prisma-env.cjs') return {};
        if (name === 'child_process') {
          return {
            spawnSync(command: string, childArgs: string[]) {
              calls.push([command, ...childArgs]);
              const result = results[calls.length - 1];
              if (!result) throw new Error(`Unexpected subprocess: ${command} ${childArgs.join(' ')}`);
              return result;
            },
          };
        }
        throw new Error(`Unexpected require: ${name}`);
      },
      process: {
        argv: ['node', 'scripts/safe-migrate.cjs', ...args],
        env: placeholder ? { __PRISMA_PLACEHOLDER_DB: '1' } : {},
        stdout: { write },
        stderr: { write },
        exit(code: number) { exitCode = code; throw exitSignal; },
      },
      console: { log: write, error: write },
    });
  } catch (error) {
    if (error !== exitSignal) throw error;
  }

  return { calls, exitCode, output: output.join('\n') };
}

describe('safe-migrate CLI recovery boundary', () => {
  it.each([
    'Error: P3018\nERROR: relation "partner_users" already exists',
    'Error: P3018\nERROR: relation "subgroups" does not exist',
    'Error: P3009\nmigrate found failed migrations in the target database',
    'Error: P1001\nCannot reach database server',
  ])('fails closed without resolving, retrying, or generating on %s', (stderr) => {
    const result = runCli({ results: [{ status: 1, stdout: 'Migration output', stderr }] });
    expect(result.exitCode).toBe(1);
    expect(result.calls).toEqual([['npx', 'prisma', 'migrate', 'deploy']]);
    expect(result.output).toContain(stderr);
    expect(result.output).toContain('No auto-resolve will be attempted');
    expect(result.output).toContain('Fresh replay is not supported');
  });

  it('treats a subprocess without an exit status as failure', () => {
    const result = runCli({ results: [{ status: null }] });
    expect(result.exitCode).toBe(1);
    expect(result.calls).toHaveLength(1);
  });

  it('runs generation only after a successful deploy and propagates its failure', () => {
    const result = runCli({ results: [{ status: 0 }, { status: 7 }] });
    expect(result.exitCode).toBe(7);
    expect(result.calls).toEqual([
      ['npx', 'prisma', 'migrate', 'deploy'],
      ['npx', 'prisma', 'generate'],
    ]);
  });

  it.each(['', '20260320;echo unsafe', '../migration'])('rejects unsafe explicit resolution %j before any subprocess', (name) => {
    const result = runCli({ args: ['--force-resolve', name] });
    expect(result.exitCode).toBe(2);
    expect(result.calls).toEqual([]);
  });

  it('makes explicit resolution one warned action with no implicit deployment', () => {
    const result = runCli({
      args: ['--force-resolve', '20260320000000_add_partner_users'],
      results: [{ status: 0 }],
    });
    expect(result.exitCode).toBe(0);
    expect(result.calls).toEqual([
      ['npx', 'prisma', 'migrate', 'resolve', '--applied', '20260320000000_add_partner_users'],
    ]);
    expect(result.output).toContain('FORCING RESOLVE');
    expect(result.output).toContain('skips schema integrity checks');
  });

  it('propagates failed explicit resolution without a retry', () => {
    const result = runCli({ args: ['--force-resolve=20260320_test'], results: [{ status: 3 }] });
    expect(result.exitCode).toBe(3);
    expect(result.calls).toHaveLength(1);
  });

  it('labels the placeholder case as skipped instead of exercising a database', () => {
    const result = runCli({ placeholder: true });
    expect(result.exitCode).toBe(0);
    expect(result.calls).toEqual([]);
    expect(result.output).toContain('no real DB configured — skipping migrate deploy');
  });
});
