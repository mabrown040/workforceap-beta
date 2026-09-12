#!/usr/bin/env node
/**
 * Reject new Prisma timestamp collisions while preserving exact historical SQL.
 * The reviewed baseline is not a migration replay or database recovery baseline.
 * Run directly or through npm run check-migrations; no database is contacted.
 */
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = join(ROOT, 'prisma', 'migrations');
const BASELINE = join(ROOT, 'scripts', 'migration-collision-baseline.json');
// Two existing migrations use date-only prefixes. Detect their collisions too;
// do not silently ignore a shorter numeric prefix or rename historical files.
const TIMESTAMP = /^(\d+)_/;

function requireDirectory(path) {
  if (!lstatSync(path).isDirectory()) throw new Error(`Expected a real directory: ${path}`);
}

function readPlainFile(path) {
  if (!lstatSync(path).isFile()) throw new Error(`Expected a regular file: ${path}`);
  return readFileSync(path);
}

function loadBaseline() {
  const baseline = JSON.parse(readPlainFile(BASELINE).toString('utf8'));
  if (
    baseline?.schemaVersion !== 1 ||
    !/^[a-f0-9]{40}$/.test(baseline.sourceCommit ?? '') ||
    !Array.isArray(baseline.groups)
  ) throw new Error('Invalid migration collision baseline: expected schemaVersion 1, sourceCommit and groups.');

  const groups = new Map();
  for (const group of baseline.groups) {
    if (
      !group || !/^\d{14}$/.test(group.timestamp ?? '') ||
      groups.has(group.timestamp) || !Array.isArray(group.migrations) || group.migrations.length < 2
    ) throw new Error('Invalid or duplicate historical collision group.');

    const members = new Map();
    for (const migration of group.migrations) {
      const name = migration?.directory;
      if (
        typeof name !== 'string' || /[/\\]/.test(name) ||
        TIMESTAMP.exec(name)?.[1] !== group.timestamp || name.length <= 15 ||
        members.has(name) || !/^[a-f0-9]{64}$/.test(migration.sha256 ?? '')
      ) throw new Error(`Invalid or duplicate baseline member for ${group.timestamp}.`);
      members.set(name, migration.sha256);
    }
    groups.set(group.timestamp, members);
  }
  return groups;
}

function readMigrations() {
  requireDirectory(join(ROOT, 'prisma'));
  requireDirectory(MIGRATIONS);
  const groups = new Map();
  for (const name of readdirSync(MIGRATIONS).sort()) {
    const timestamp = TIMESTAMP.exec(name)?.[1];
    if (!timestamp) continue; // Naming/schema policy is separate; migration_lock.toml is not a migration.
    const directory = join(MIGRATIONS, name);
    requireDirectory(directory);
    const hash = createHash('sha256').update(readPlainFile(join(directory, 'migration.sql'))).digest('hex');
    const members = groups.get(timestamp) ?? new Map();
    members.set(name, hash);
    groups.set(timestamp, members);
  }
  return groups;
}

function check() {
  if (process.argv.length !== 2) throw new Error('Usage: node scripts/check-duplicate-migrations.mjs (no baseline update mode).');
  const baseline = loadBaseline();
  const current = readMigrations();
  const failures = [];

  // Validate every baseline group, even if a deletion/rename would hide its collision.
  for (const [timestamp, expected] of baseline) {
    const actual = current.get(timestamp) ?? new Map();
    const expectedNames = [...expected.keys()].sort();
    const actualNames = [...actual.keys()].sort();
    if (JSON.stringify(expectedNames) !== JSON.stringify(actualNames)) {
      failures.push(
        `Historical collision membership changed at ${timestamp}.\n` +
        `  expected: ${expectedNames.join(', ')}\n  actual: ${actualNames.join(', ') || '(missing)'}`,
      );
    }
    for (const [name, checksum] of expected) {
      if (actual.has(name) && actual.get(name) !== checksum) {
        failures.push(`Historical SQL checksum changed: prisma/migrations/${name}/migration.sql`);
      }
    }
  }

  for (const [timestamp, members] of current) {
    if (members.size > 1 && !baseline.has(timestamp)) {
      failures.push(`Unrecognized collision at ${timestamp}: ${[...members.keys()].sort().join(', ')}`);
    }
  }

  if (failures.length) {
    console.error(failures.join('\n'));
    console.error(
      'Preserve historical migration directories and SQL bytes. Choose a unique timestamp only for a new, unapplied migration.\n' +
      'Do not regenerate the historical exceptions to accept a new collision. See docs/DATABASE-RECOVERY.md.',
    );
    process.exitCode = 1;
    return;
  }
  console.log(`Migration timestamps verified: ${baseline.size} historical collision group(s) unchanged; no new collisions.`);
}

try {
  check();
} catch (error) {
  console.error(`check-duplicate-migrations: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
