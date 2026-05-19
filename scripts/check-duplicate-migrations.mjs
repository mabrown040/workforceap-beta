#!/usr/bin/env node
/**
 * check-duplicate-migrations.mjs
 *
 * Verifies that no two Prisma migration directories share the same timestamp
 * prefix. Prisma orders migrations alphabetically; two migrations with the
 * same numeric prefix can be silently reordered between machines, which leads
 * to non-deterministic schema drift and is exactly the failure mode that
 * produced the `fix_schema_drift_*` rescue migrations in this repo
 * (PLAN-2026-Q3 §0 / AUDIT-2026-05-16 §C-D3).
 *
 * Exit 0 if all timestamps are unique. Exit 1 with a clear message and the
 * conflicting paths otherwise.
 *
 * Standalone script — wired into pre-commit when husky is installed, and
 * safe to call from CI directly:
 *   node scripts/check-duplicate-migrations.mjs
 */

import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const MIGRATIONS_DIR = join(REPO_ROOT, 'prisma', 'migrations');

if (!existsSync(MIGRATIONS_DIR)) {
  console.error(`check-duplicate-migrations: ${MIGRATIONS_DIR} does not exist`);
  process.exit(0);
}

const TIMESTAMP_RE = /^(\d{14})_/;

const entries = readdirSync(MIGRATIONS_DIR);
const byTimestamp = new Map(); // timestamp -> [dirname, ...]

for (const name of entries) {
  const full = join(MIGRATIONS_DIR, name);
  let st;
  try {
    st = statSync(full);
  } catch {
    continue;
  }
  if (!st.isDirectory()) continue;
  const m = TIMESTAMP_RE.exec(name);
  if (!m) continue;
  const ts = m[1];
  const list = byTimestamp.get(ts) ?? [];
  list.push(name);
  byTimestamp.set(ts, list);
}

const dupes = [...byTimestamp.entries()].filter(([, list]) => list.length > 1);

if (dupes.length === 0) {
  process.exit(0);
}

console.error('Duplicate migration timestamp detected — re-timestamp the second migration.');
console.error('Prisma orders alphabetically and may silently reorder.');
console.error('');
for (const [ts, list] of dupes) {
  console.error(`  timestamp ${ts}:`);
  for (const name of list) {
    console.error(`    prisma/migrations/${name}`);
  }
}
console.error('');
console.error('Fix: rename the later migration directory to bump its timestamp prefix,');
console.error('then update prisma/migrations/migration_lock.toml if needed.');

process.exit(1);
