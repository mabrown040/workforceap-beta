import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `pg_advisory_xact_lock()` returns void. Prisma's `$queryRaw` tries to
 * deserialize every returned column, and a void column raises P2010
 * ("Failed to deserialize column of type 'void'"), aborting the whole
 * transaction.
 *
 * That took the Coursera B4B sync cron down for days in production — 460
 * failed runs across 13 members, so course progress silently stopped
 * updating. Advisory locks must go through `$executeRaw`, which returns a
 * row count and deserializes nothing.
 */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

test('advisory locks never run through $queryRaw', () => {
  const roots = ['lib', 'app'].map((d) => join(process.cwd(), d));
  const offenders: string[] = [];

  for (const root of roots) {
    for (const file of sourceFiles(root)) {
      const source = readFileSync(file, 'utf8');
      if (!source.includes('pg_advisory')) continue;
      // Any $queryRaw whose statement reaches an advisory lock before the
      // template literal closes is the failing shape.
      const pattern = /\$queryRaw(?:<[^>]*>)?\((?:Prisma\.sql)?`[^`]*pg_advisory[^`]*`/g;
      if (pattern.test(source)) offenders.push(file.replace(process.cwd() + '/', ''));
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Use $executeRaw for advisory locks (void return breaks $queryRaw): ${offenders.join(', ')}`,
  );
});
