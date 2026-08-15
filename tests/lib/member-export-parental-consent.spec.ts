/**
 * M3 — `parentalConsentGiven: false` in a minor's own GDPR export reads as
 * consent REFUSED.
 *
 * The column is written `false` at signup for a minor applying through a
 * school partner and no code path ever flips it: the form is paper, the school
 * returns it, an admin records it (the structured admin write path is Phase
 * B5). Exported raw — `false` with a null date — it tells the student and
 * their parent that consent was declined, when what it means is "not collected
 * yet". Nothing in the export says which.
 *
 * The DB column is deliberately unchanged; this is a presentation fix.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const profile = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));

vi.mock('@/lib/db/prisma', () => {
  // Every relation in the export is a findMany/findUnique this test does not
  // care about; a Proxy answers them all so the spec stays about one field.
  const model = {
    findMany: async () => [],
    findUnique: async (args: { where?: { id?: string } }) =>
      args?.where?.id === 'member-1'
        ? {
            id: 'member-1',
            email: 'alex.prior@example.com',
            fullName: 'Alex Prior',
            userRoles: [],
            organization: null,
            profile: profile.current,
          }
        : null,
    findFirst: async () => null,
  };
  return {
    prisma: new Proxy({}, { get: () => model }),
  };
});

import { buildMemberExport } from '@/lib/member/exportData';

function minorProfile(overrides: Record<string, unknown> = {}) {
  return {
    isMinor: true,
    parentGuardianName: 'Dana Guardian',
    parentGuardianEmail: 'dana.guardian@example.com',
    parentGuardianPhone: '5125550123',
    parentalConsentGiven: false,
    parentalConsentDate: null,
    barrierTypes: [],
    ...overrides,
  };
}

beforeEach(() => {
  profile.current = minorProfile();
});

describe('buildMemberExport parental consent', () => {
  it('reports NOT YET COLLECTED, not a bare false', async () => {
    const exported = (await buildMemberExport('member-1')) as {
      profile: Record<string, unknown>;
    };

    expect(exported.profile.parentalConsentStatus).toBe('not_yet_collected');
  });

  it('reports on_file once an admin has recorded the signed form', async () => {
    profile.current = minorProfile({
      parentalConsentGiven: true,
      parentalConsentDate: new Date('2026-09-01T00:00:00Z'),
    });

    const exported = (await buildMemberExport('member-1')) as {
      profile: Record<string, unknown>;
    };

    expect(exported.profile.parentalConsentStatus).toBe('on_file');
    expect(exported.profile.parentalConsentDate).toBe('2026-09-01T00:00:00.000Z');
  });

  it('still exports the raw column, so the export stays a faithful dump', async () => {
    const exported = (await buildMemberExport('member-1')) as {
      profile: Record<string, unknown>;
    };

    expect(exported.profile.parentalConsentGiven).toBe(false);
    expect(exported.profile.isMinor).toBe(true);
  });
});
