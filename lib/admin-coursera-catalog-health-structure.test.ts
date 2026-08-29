import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('admin Coursera renders org-scoped catalog health and its accuracy classes', () => {
  const page = readFileSync(join(ROOT, 'app/admin/coursera/page.tsx'), 'utf8');

  assert.match(page, /loadValidatedProgramCatalog\(\{ organizationId: scope\.orgId \}\)/);
  assert.match(page, /<CourseraCatalogHealthSection/);
  assert.match(page, /Mapped \/ Y/);
  assert.match(page, /healthy empty/);
  assert.match(page, /Stale IDs/);
  assert.match(page, /Wrong type/);
  assert.match(page, /Additional Coursera activity/);
});
