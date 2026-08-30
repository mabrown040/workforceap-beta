import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const routes = [
  'app/api/admin/members/[id]/program/route.ts',
  'app/api/admin/members/[id]/coursera-enrollment-approval/route.ts',
  'app/api/admin/coursera/enroll-member/route.ts',
];

test('admin member mutations preserve tenant isolation and super-admin support access', () => {
  for (const route of routes) {
    const source = readFileSync(join(process.cwd(), route), 'utf8');
    assert.match(source, /isSuperAdmin\(user\.id\)/, `${route} must resolve platform role`);
    assert.match(
      source,
      /canAdminActInSubjectOrganization\(\{ actorOrgId, subjectOrgId(?:\s*:\s*orgId)?, superAdmin \}\)/,
      `${route} must use the shared subject-tenant authorization predicate`,
    );
    assert.doesNotMatch(
      source,
      /actorOrgId\s*!==\s*subjectOrgId/,
      `${route} must not reject deliberate super-admin support access`,
    );
  }
});

test('admin member detail resolves program and WIOA context from the subject member', () => {
  const route = 'app/admin/members/[id]/page.tsx';
  const source = readFileSync(join(process.cwd(), route), 'utf8');

  assert.match(
    source,
    /const organizationId = member\.organizationId;/,
    'cross-tenant super-admin views must use the member organization',
  );
  assert.match(source, /organizationProgramCatalog\.findMany\([\s\S]*where: \{ organizationId \}/);
  assert.match(source, /loadWioaReviewSnapshots\(member\.id, organizationId\)/);
  assert.doesNotMatch(source, /getActorOrganizationId\(user\.id\)/);
});

test('admin program assignment validates the subject organization catalog', () => {
  const source = readFileSync(
    join(process.cwd(), 'app/api/admin/members/[id]/program/route.ts'),
    'utf8',
  );

  assert.match(source, /organizationProgramCatalog\.count\(\{ where: \{ organizationId: orgId \} \}\)/);
  assert.match(source, /organizationProgramCatalog\.findFirst\(\{[\s\S]{0,160}organizationId: orgId, programSlug/);
  assert.match(source, /catalogSize > 0 && !catalogEntry/);
});

test('paid admin enrollment follows the primary CourseEnrollment', () => {
  const source = readFileSync(
    join(process.cwd(), 'app/api/admin/coursera/enroll-member/route.ts'),
    'utf8',
  );

  assert.match(source, /resolveActiveDashboardProgram\(\{/);
  assert.match(source, /enrollments: member\.courseEnrollments/);
  assert.match(source, /DISCOVERED_COURSERA_PROGRAMS\[enrolledProgram\]/);
  assert.match(source, /triggerAutoSyncBestEffort\(\{[\s\S]{0,220}enrolledProgram,/);
  assert.doesNotMatch(source, /DISCOVERED_COURSERA_PROGRAMS\[member\.enrolledProgram\]/);
});

test('legacy Coursera progress audit cannot cross tenants for an org admin', () => {
  const pageSource = readFileSync(
    join(process.cwd(), 'app/admin/coursera/page.tsx'),
    'utf8',
  );
  const helperSource = readFileSync(
    join(process.cwd(), 'lib/admin/courseraOps.ts'),
    'utf8',
  );

  assert.match(
    pageSource,
    /loadMemberProgressAuditByEmail\(auditEmailRaw,\s*\{[\s\S]{0,240}organizationId:\s*scope\.superAdmin\s*\?\s*null\s*:\s*scope\.orgId/,
  );
  assert.match(
    helperSource,
    /options:\s*\{[\s\S]{0,220}organizationId:\s*string\s*\|\s*null/,
  );
  assert.match(
    helperSource,
    /\.\.\.\(options\.organizationId\s*\?\s*\{\s*organizationId:\s*options\.organizationId\s*\}\s*:\s*\{\}\)/,
  );
});
