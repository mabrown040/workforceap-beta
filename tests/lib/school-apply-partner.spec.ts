/**
 * Phase B4 — which `/apply` visitors get the school variant of the wizard.
 *
 * The security-relevant property: the school variant skips the two
 * workforce-funding questions, so the ONLY thing allowed to trigger it is a
 * `partnerType` read back from the database. A visitor who invents a query
 * param must get the ordinary wizard.
 */
import { describe, it, expect, vi } from 'vitest';

// The module imports the real Prisma client for its default seam; tests
// always inject `deps.db`, so no client is ever constructed.
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import {
  resolveApplyPartnerRef,
  resolveSchoolApplyPartner,
  SCHOOL_PARTNER_TYPE,
  type SchoolApplyPartner,
  type SchoolApplyPartnerDb,
} from '@/lib/apply/schoolApplyPartner';

function partnerRow(overrides: Partial<SchoolApplyPartner> = {}): SchoolApplyPartner {
  return {
    id: 'partner-concordia',
    name: 'Concordia High School',
    slug: 'concordia-hs',
    partnerType: SCHOOL_PARTNER_TYPE,
    schoolDistrict: 'Austin ISD',
    ...overrides,
  };
}

/** Records every lookup so "no ref ⇒ no query" is directly assertable. */
function stubDb(row: SchoolApplyPartner | null) {
  const calls: unknown[] = [];
  const db: SchoolApplyPartnerDb = {
    partner: {
      findFirst: async (args) => {
        calls.push(args);
        return row;
      },
    },
  };
  return { db, calls };
}

describe('resolveApplyPartnerRef', () => {
  it('prefers the query param over the attribution cookie', () => {
    expect(resolveApplyPartnerRef('new-school', 'stale-school')).toBe('new-school');
  });

  it('falls back to the cookie when there is no query param', () => {
    expect(resolveApplyPartnerRef(undefined, 'concordia-hs')).toBe('concordia-hs');
  });

  it('normalizes case', () => {
    expect(resolveApplyPartnerRef('Concordia-HS', null)).toBe('concordia-hs');
  });

  it('rejects anything that is not a plausible slug, from either source', () => {
    for (const bad of ['../admin', '%2Fetc%2Fpasswd', 'partner ref', 'a'.repeat(65), '   ']) {
      expect(resolveApplyPartnerRef(bad, null), `param: ${bad}`).toBeNull();
      expect(resolveApplyPartnerRef(null, bad), `cookie: ${bad}`).toBeNull();
    }
  });

  it('is null when neither source has a ref', () => {
    expect(resolveApplyPartnerRef(undefined, undefined)).toBeNull();
  });
});

describe('resolveSchoolApplyPartner', () => {
  it('returns the partner for an active high school', async () => {
    const { db, calls } = stubDb(partnerRow());

    await expect(resolveSchoolApplyPartner('concordia-hs', { db })).resolves.toEqual(partnerRow());
    expect(calls).toEqual([
      {
        where: {
          active: true,
          OR: [{ referralCode: 'concordia-hs' }, { slug: 'concordia-hs' }],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          partnerType: true,
          schoolDistrict: true,
        },
      },
    ]);
  });

  it('selects only the five columns the wizard renders', async () => {
    // Phase B3 lesson: a bare lookup ships internal notes, school contact PII,
    // stripeConnectId and organizationId into a public page's RSC payload.
    const { db, calls } = stubDb(partnerRow());
    await resolveSchoolApplyPartner('concordia-hs', { db });

    const select = (calls[0] as { select: Record<string, unknown> }).select;
    expect(Object.keys(select).sort()).toEqual([
      'id',
      'name',
      'partnerType',
      'schoolDistrict',
      'slug',
    ]);
  });

  it('runs NO query when there is no ref', async () => {
    // Organic and paid traffic is the common case and must not pay for a
    // database round trip it cannot use.
    const { db, calls } = stubDb(partnerRow());

    await expect(resolveSchoolApplyPartner(null, { db })).resolves.toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('returns null for a partner that is not a high school', async () => {
    // A community or employer partner's applicants are adults on workforce
    // funding — they must keep the standard screener.
    const { db } = stubDb(partnerRow({ partnerType: 'community' }));

    await expect(resolveSchoolApplyPartner('some-partner', { db })).resolves.toBeNull();
  });

  it('returns null when the ref matches no partner', async () => {
    const { db } = stubDb(null);

    await expect(resolveSchoolApplyPartner('nope', { db })).resolves.toBeNull();
  });

  it('scopes the lookup to active partners', async () => {
    const { db, calls } = stubDb(partnerRow());
    await resolveSchoolApplyPartner('concordia-hs', { db });

    expect((calls[0] as { where: { active: boolean } }).where.active).toBe(true);
  });

  it('degrades to the default wizard when the lookup throws', async () => {
    // `/apply` is the top of the live funnel; a partner-table blip must not
    // turn it into an error page.
    const db: SchoolApplyPartnerDb = {
      partner: {
        findFirst: async () => {
          throw new Error('connection lost');
        },
      },
    };

    await expect(resolveSchoolApplyPartner('concordia-hs', { db })).resolves.toBeNull();
  });
});
