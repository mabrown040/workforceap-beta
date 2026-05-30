import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const scriptPath = join(process.cwd(), 'scripts/audit-ai-tools-history.js');

test('AI tools audit script reads login credentials from environment variables', () => {
  const src = readFileSync(scriptPath, 'utf8');

  assert.match(src, /process\.env\.WAP_AUDIT_EMAIL/);
  assert.match(src, /process\.env\.WAP_AUDIT_PASSWORD/);
  assert.doesNotMatch(
    src,
    /page\.fill\([^,\n]*email[^,\n]*,\s*['"`][^'"`@]+@[^'"`]+['"`]\s*\)/i,
    'audit email must not be hard-coded in Playwright fill calls',
  );
  assert.doesNotMatch(
    src,
    /page\.fill\([^,\n]*password[^,\n]*,\s*['"`][^'"`]+['"`]\s*\)/i,
    'audit password must not be hard-coded in Playwright fill calls',
  );
});
