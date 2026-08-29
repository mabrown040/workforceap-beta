import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { aiToolsActivityScope, aiToolsUserScope } from './admin/cohortAnalytics';

const pagePath = join(process.cwd(), 'app/admin/ai-tools/page.tsx');
const analyticsPath = join(process.cwd(), 'lib/admin/cohortAnalytics.ts');

test('admin AI tools page checks tenant-aware admin access before loading analytics', () => {
  const src = readFileSync(pagePath, 'utf8');
  const authGuard = "if (!user) redirect('/login?redirectTo=/admin/ai-tools');";
  const scopeLoad = 'const scope = await resolveAdminPageTenant(user.id);';
  const adminGuard = "if (!scope.ok) redirect('/dashboard');";
  const analyticsScope = 'const analyticsOrgId = scope.superAdmin ? undefined : scope.orgId;';
  const usageLoad = 'getAiToolUsageCounts(analyticsOrgId)';
  const analyticsLoad = 'getAiToolsCohortStats(analyticsOrgId)';

  assert.match(src, /import \{[^}]*resolveAdminPageTenant[^}]*\} from '@\/lib\/tenant\/adminPageScope';/);
  assert.ok(src.includes(authGuard), 'missing unauthenticated redirect guard');
  assert.ok(src.includes(scopeLoad), 'missing tenant-aware admin scope lookup');
  assert.ok(src.includes(adminGuard), 'missing admin authorization guard');
  assert.ok(
    src.includes(analyticsScope),
    'ordinary admins must pass their org to analytics while super-admins remain cross-tenant'
  );
  assert.equal(
    src.matchAll(new RegExp(adminGuard.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')).toArray().length,
    1,
    'admin authorization guard should only run once'
  );
  assert.ok(
    src.indexOf(authGuard) < src.indexOf(scopeLoad),
    'authentication guard must run before tenant scope lookup'
  );
  assert.ok(
    src.indexOf(scopeLoad) < src.indexOf(adminGuard),
    'tenant scope lookup must run before admin authorization'
  );
  assert.ok(
    src.indexOf(adminGuard) < src.indexOf(usageLoad),
    'admin guard must run before loading usage data'
  );
  assert.ok(
    src.indexOf(adminGuard) < src.indexOf(analyticsLoad),
    'admin guard must run before loading analytics data'
  );
});

test('AI tools analytics builds isolated predicates for two orgs and keeps super-admin global', () => {
  assert.deepEqual(aiToolsUserScope('org-a'), {
    deletedAt: null,
    organizationId: 'org-a',
  });
  assert.deepEqual(aiToolsUserScope('org-b'), {
    deletedAt: null,
    organizationId: 'org-b',
  });
  assert.notDeepEqual(aiToolsUserScope('org-a'), aiToolsUserScope('org-b'));

  assert.deepEqual(aiToolsActivityScope('org-a'), {
    user: { organizationId: 'org-a' },
  });
  assert.deepEqual(aiToolsActivityScope('org-b'), {
    user: { organizationId: 'org-b' },
  });
  assert.notDeepEqual(aiToolsActivityScope('org-a'), aiToolsActivityScope('org-b'));

  assert.deepEqual(aiToolsUserScope(undefined), { deletedAt: null });
  assert.deepEqual(aiToolsActivityScope(undefined), {});
});

test('both raw voice analytics queries join users and apply the requested org', () => {
  const src = readFileSync(analyticsPath, 'utf8');
  const aiToolsSection = src.slice(
    src.indexOf('export async function getAiToolsCohortStats'),
    src.indexOf('export type CertificationsCohortRow')
  );

  assert.equal(
    aiToolsSection.split('INNER JOIN users u ON u.id = me.user_id').length - 1,
    2,
    'cohort rows and card counts must both resolve voice events through their user'
  );
  assert.equal(
    aiToolsSection.split('AND u.organization_id = ${orgId}').length - 1,
    2,
    'cohort rows and card counts must both filter voice events by the requested org'
  );
  assert.match(
    src,
    /const \{ crossTenantOK \} = await import\('@\/lib\/tenant\/withTenantScope'\);[\s\S]*return crossTenantOK\(query\);/,
    'the deliberate super-admin raw-query path must be marked crossTenantOK'
  );
});
