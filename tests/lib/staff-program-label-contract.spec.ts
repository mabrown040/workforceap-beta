import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');

const STAFF_PROGRAM_SURFACES = [
  'app/(portal)/counselor/page.tsx',
  'components/portal/counselor/AtRiskDashboard.tsx',
  'components/portal/counselor/AtRiskMemberList.tsx',
  'components/portal/counselor/CounselorCommandCenter.tsx',
  'components/portal/counselor/CounselorPriorityQueue.tsx',
  'components/portal/counselor/CounselorStudentsRosterClient.tsx',
  'components/admin/AdminCommandCenterClient.tsx',
  'components/admin/AdminPipelineKanban.tsx',
] as const;

/**
 * Either resolver maps a stored program key to its catalog title.
 * `programDisplayTitle` (lib/content/programTitle.ts) wraps `getProgramBySlug`
 * and additionally canonicalizes aliases and humanises unknown slugs, so a
 * surface may use either; what it must never do is print the raw key.
 */
const CATALOG_TITLE_RESOLVERS = ['programDisplayTitle', 'getProgramBySlug'] as const;

describe('staff-facing program labels', () => {
  it.each(STAFF_PROGRAM_SURFACES)('%s resolves catalog titles instead of exposing stable slugs', (file) => {
    const source = readFileSync(path.join(root, file), 'utf8');
    const resolversUsed = CATALOG_TITLE_RESOLVERS.filter((name) => source.includes(name));
    expect(
      resolversUsed.length,
      `${file} must resolve program labels through ${CATALOG_TITLE_RESOLVERS.join(' or ')}`,
    ).toBeGreaterThan(0);
  });
});
