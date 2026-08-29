import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const csvSource = readSource('lib/coursera/csvImport.server.ts');
const mappingServiceSource = readSource(
  'lib/coursera/mapIdentityAndProgress.server.ts',
);
const xapiMappingsSource = readSource('lib/xapi/mappings.ts');
const xapiReprocessSource = readSource('lib/xapi/reprocess.ts');
const memberMergeSource = readSource('lib/admin/memberMerge.ts');
const auditSource = readSource('scripts/audit-coursera-links.ts');

const atomicMappingRoutes = [
  'app/api/admin/coursera/map-unmatched/route.ts',
  'app/api/admin/coursera/mappings/route.ts',
  'app/api/member/coursera/identity/route.ts',
];

describe('Coursera Stage A legacy-writer compatibility', () => {
  it('retains both old global conflict targets for the serving deployment', () => {
    expect(csvSource).toContain(
      'ON CONFLICT (LOWER(external_email), coursera_course_id) DO UPDATE SET',
    );
    expect(csvSource).toContain(
      'ON CONFLICT (LOWER(external_email), badge_slug) DO UPDATE SET',
    );
  });

  it('uses the Stage B-compatible sorted global email advisory lock', () => {
    expect(csvSource).toContain('coursera:raw-email:${email}');
    expect(csvSource).toContain('pg_advisory_xact_lock');
    expect(csvSource).toContain('hashtextextended(ordered.lock_key, 0)');
    expect(csvSource).toContain(')].sort();');
    expect(csvSource.match(/await lockLegacyRawCourseraEmails\(/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('row-locks every incoming user before a raw insert can stamp a tenant', () => {
    expect(csvSource.match(/await assertRawWriterUsersBelongToOrganization\(/g)).toHaveLength(2);
    expect(csvSource).toContain(
      'candidate_user.organization_id = ${normalizedOrganizationId}',
    );
    expect(csvSource).toContain('candidate_user.deleted_at IS NULL');
    expect(csvSource).toContain('ORDER BY candidate_user.id');
    expect(csvSource).toContain('FOR SHARE');
  });

  it('preserves identity and makes course and badge achievements monotonic', () => {
    expect(csvSource).toContain(
      'user_id = COALESCE(coursera_course_progress.user_id, EXCLUDED.user_id)',
    );
    expect(csvSource).toContain('overall_progress = GREATEST(');
    expect(csvSource).toContain(
      'is_completed = coursera_course_progress.is_completed OR EXCLUDED.is_completed',
    );
    expect(csvSource).toContain(
      'user_id = COALESCE(coursera_badge_progress.user_id, EXCLUDED.user_id)',
    );
    expect(csvSource).toContain('progress_percent = GREATEST(');
    expect(csvSource).toContain('courses_completed = GREATEST(');
    expect(csvSource).toContain(
      'badge_completed = coursera_badge_progress.badge_completed OR EXCLUDED.badge_completed',
    );
  });

  it('fails closed when an existing raw row belongs to another tenant or user', () => {
    expect(csvSource).toContain(
      'OR coursera_course_progress.organization_id = EXCLUDED.organization_id',
    );
    expect(csvSource).toContain(
      'OR coursera_badge_progress.organization_id = EXCLUDED.organization_id',
    );
    expect(csvSource).toContain(
      'OR coursera_course_progress.user_id = EXCLUDED.user_id',
    );
    expect(csvSource).toContain(
      'OR coursera_badge_progress.user_id = EXCLUDED.user_id',
    );
    expect(csvSource).toContain('if (rows.length !== items.length)');
    expect(csvSource).toContain('if (upsertRows.length !== items.length)');
  });

  it('commits identity mapping and raw adoption in one transaction', () => {
    const transactionOwned = mappingServiceSource.indexOf(
      'export async function mapCourseraIdentityAndProgressInTransaction',
    );
    const attachment = mappingServiceSource.indexOf('attachRawCourseraProgressToUser(');
    const mapping = mappingServiceSource.indexOf('upsertCourseraIdentityMapping(');
    const transaction = mappingServiceSource.indexOf('prisma.$transaction((tx) =>');
    const delegated = mappingServiceSource.indexOf(
      'mapCourseraIdentityAndProgressInTransaction(normalized, tx)',
    );
    expect(transactionOwned).toBeGreaterThan(-1);
    expect(attachment).toBeGreaterThan(transactionOwned);
    expect(mapping).toBeGreaterThan(attachment);
    expect(transaction).toBeGreaterThan(mapping);
    expect(delegated).toBeGreaterThan(transaction);
    expect(mappingServiceSource).toContain('expectedOrganizationId: organizationId');
    expect(mappingServiceSource).toContain('FOR SHARE');

    for (const routePath of atomicMappingRoutes) {
      const routeSource = readSource(routePath);
      expect(routeSource).toContain('mapCourseraIdentityAndProgress');
      expect(routeSource).not.toMatch(/await backfillUserIdForCourseraEmail\(/);
      expect(routeSource).not.toMatch(/await upsertCourseraIdentityMapping\(/);
    }
  });

  it('keeps reconcile user creation, adoption, and mapping in one transaction', () => {
    const source = readSource(
      'app/api/admin/coursera/reconcile/add-to-wap/route.ts',
    );
    const transaction = source.indexOf('prisma.$transaction(async (tx) =>');
    const mapping = source.indexOf('mapCourseraIdentityAndProgressInTransaction(');
    expect(transaction).toBeGreaterThan(-1);
    expect(mapping).toBeGreaterThan(transaction);
    expect(source).not.toContain('upsertCourseraIdentityMapping');
    expect(source).not.toContain('backfillUserIdForCourseraEmail');
  });

  it('routes automatic xAPI mapping writers through guarded adoption', () => {
    expect(xapiMappingsSource).toContain('mapCourseraIdentityAndProgress');
    expect(xapiMappingsSource).not.toMatch(/await upsertCourseraIdentityMapping\(\{/);
    expect(xapiMappingsSource).toContain(
      'Fail closed: without the guarded mapping/adoption transaction succeeding',
    );
    expect(xapiMappingsSource).toMatch(/catch \(mappingError\)[\s\S]*?return null;/);
    expect(xapiReprocessSource).toContain('mapCourseraIdentityAndProgress');
    expect(xapiReprocessSource).not.toContain('upsertCourseraIdentityMapping');
  });

  it('blocks member merge before any raw or mapping ownership mutation', () => {
    expect(memberMergeSource).toContain('assertNoCourseraOwnershipForMemberMerge');
    expect(memberMergeSource).not.toContain("repoint('courseraCourseProgress', 'userId')");
    expect(memberMergeSource).not.toContain("repoint('courseraBadgeProgress', 'userId')");
    expect(memberMergeSource).not.toContain("repoint('courseraIdentityMapping', 'userId')");
    expect(memberMergeSource).toContain('ORDER BY merge_user.id');
    expect(memberMergeSource).toContain('FOR UPDATE');
    expect(memberMergeSource).toContain(
      'Member merge blocked: secondary member has Coursera progress or identity mappings',
    );
  });

  it('scopes bulk orphan repair to the actor organization', () => {
    const routeSource = readSource(
      'app/api/admin/coursera/backfill-orphans/route.ts',
    );
    expect(routeSource).toContain('getActorOrganizationId(admin.id)');
    expect(routeSource).toContain(
      'backfillAllOrphanedCourseraProgress(organizationId)',
    );
    expect(csvSource).toContain(
      'target_user.organization_id = ${normalizedOrganizationId}',
    );
    expect(csvSource).toContain(
      'mapping.organization_id = ${normalizedOrganizationId}',
    );
  });

  it('keeps the link audit read-only and rejects the former fixture mode', () => {
    expect(auditSource).not.toContain('INSERT INTO coursera_course_progress');
    expect(auditSource).not.toContain('UPDATE coursera_course_progress');
    expect(auditSource).not.toContain('DELETE FROM coursera_course_progress');
    expect(auditSource).toContain('--fixture was removed');
  });
});
