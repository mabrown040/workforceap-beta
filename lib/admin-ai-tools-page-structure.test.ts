import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pagePath = join(process.cwd(), 'app/admin/ai-tools/page.tsx');

test('admin AI tools page checks admin access before loading cohort analytics', () => {
  const src = readFileSync(pagePath, 'utf8');
  const authGuard = "if (!user) redirect('/login?redirectTo=/admin/ai-tools');";
  const adminGuard = 'if (!(await isAdmin(user.id))) redirect';
  const analyticsLoad = 'getAiToolsCohortStats()';

  assert.match(src, /import \{ isAdmin \} from '@\/lib\/auth\/roles';/);
  assert.ok(src.includes(authGuard), 'missing unauthenticated redirect guard');
  assert.ok(src.includes(adminGuard), 'missing admin authorization guard');
  assert.equal(
    src.matchAll(new RegExp(adminGuard.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')).toArray().length,
    1,
    'admin authorization guard should only run once'
  );
  assert.ok(
    src.indexOf(authGuard) < src.indexOf(adminGuard),
    'authentication guard must run before admin authorization'
  );
  assert.ok(
    src.indexOf(adminGuard) < src.indexOf(analyticsLoad),
    'admin guard must run before loading analytics data'
  );
});
