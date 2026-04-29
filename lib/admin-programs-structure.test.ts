import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.join(process.cwd(), 'app/admin/programs/page.tsx');
const source = fs.readFileSync(sourcePath, 'utf8');

test('admin programs page keeps one responsive enrollment stats tree', () => {
  assert.equal((source.match(/programStats\.map\(/g) ?? []).length, 1);
  assert.equal((source.match(/data-program-stats-tree="single-responsive-tree"/g) ?? []).length, 1);
  assert.match(source, /aria-labelledby="program-enrollment-stats-heading"/);
  assert.match(source, /data-program-stats-card/);
  assert.match(source, /data-program-slug=\{program\.slug\}/);
  assert.match(source, /data-program-metric="enrolled"/);
  assert.match(source, /data-program-metric="avg-score"/);
  assert.match(source, /data-program-metric="courses-completed"/);
});
