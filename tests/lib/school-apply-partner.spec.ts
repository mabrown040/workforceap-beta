/**
 * Phase B4 — which `/apply` visitors get the school variant of the wizard.
 *
 * The security-relevant property: the school variant skips the two
 * workforce-funding questions, so the ONLY thing allowed to trigger it is a
 * `partnerType` read back from the database. A visitor who invents a query
 * param must get the ordinary wizard.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The module imports the real Prisma client for its default seam; tests
// always inject `deps.db`, so no client is ever constructed.
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/observability/captureApiError', () => ({ captureApiError: vi.fn() }));

import { logger } from '@/lib/observability/logger';
import { captureApiError } from '@/lib/observability/captureApiError';
import {
  resolveApplyPartnerRef,
  resolveSchoolApplyPartner,
  SCHOOL_PARTNER_TYPE,
  type SchoolApplyPartner,
  type SchoolApplyPartnerDb,
} from '@/lib/apply/schoolApplyPartner';

const NOW = new Date('2026-08-15T12:00:00Z');

function partnerRow(overrides: Partial<SchoolApplyPartner> = {}): SchoolApplyPartner {
  return {
    id: 'partner-concordia',
    name: 'Concordia High School',
    slug: 'concordia-hs',
    partnerType: SCHOOL_PARTNER_TYPE,
    schoolDistrict: 'Austin ISD',
    sponsoredEnrollment: true,
    sponsorshipStartsAt: null,
    sponsorshipEndsAt: null,
    sponsorshipSeatCap: null,
    ...overrides,
  };
}

/** Records every lookup so "no ref ⇒ no query" is directly assertable. */
function stubDb(row: SchoolApplyPartner | null, options: { usedSeats?: number } = {}) {
  const calls: unknown[] = [];
  const seatCounts: unknown[] = [];
  const db: SchoolApplyPartnerDb = {
    partner: {
      findFirst: async (args) => {
        calls.push(args);
        return row;
      },
    },
    courseEnrollment: {
      count: async (args) => {
        seatCounts.push(args);
        return options.usedSeats ?? 0;
      },
    },
  };
  return { db, calls, seatCounts };
}

beforeEach(() => {
  vi.clearAllMocks();
});

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

    await expect(resolveSchoolApplyPartner('concordia-hs', { db, now: NOW })).resolves.toEqual({
      ...partnerRow(),
      sponsorshipInForce: true,
    });
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
          sponsoredEnrollment: true,
          sponsorshipStartsAt: true,
          sponsorshipEndsAt: true,
          sponsorshipSeatCap: true,
        },
      },
    ]);
  });

  it('selects only the columns the wizard renders — never the notes columns', async () => {
    // Phase B3 lesson: a bare lookup ships internal notes, school contact PII,
    // stripeConnectId and organizationId into a public page's RSC payload.
    const { db, calls } = stubDb(partnerRow());
    await resolveSchoolApplyPartner('concordia-hs', { db, now: NOW });

    const select = (calls[0] as { select: Record<string, unknown> }).select;
    expect(Object.keys(select).sort()).toEqual([
      'id',
      'name',
      'partnerType',
      'schoolDistrict',
      'slug',
      'sponsoredEnrollment',
      'sponsorshipEndsAt',
      'sponsorshipSeatCap',
      'sponsorshipStartsAt',
    ]);
    // The sponsorship NOTES column is admin-internal and stays out.
    expect(select).not.toHaveProperty('sponsorshipNotes');
    expect(select).not.toHaveProperty('contactEmail');
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

  it('degrades to the default wizard when the lookup throws — and ALERTS', async () => {
    // `/apply` is the top of the live funnel; a partner-table blip must not
    // turn it into an error page. But the degraded funnel is wrong for that
    // student in ways nothing downstream can detect — they get asked about
    // their own employment status and household income, no guardian is
    // captured, and the application carries no school attribution. A
    // `logger.warn` into console output nobody reads is not a report of that.
    const { db } = stubDb(null);
    db.partner.findFirst = async () => {
      throw new Error('connection lost');
    };

    await expect(resolveSchoolApplyPartner('concordia-hs', { db, now: NOW })).resolves.toBeNull();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logger.error).mock.calls[0][0]).toContain('school partner lookup failed');
    expect(captureApiError).toHaveBeenCalledTimes(1);
    expect(vi.mocked(captureApiError).mock.calls[0][1]).toMatchObject({
      route: 'GET /apply#schoolApplyPartner',
    });
    // Never downgraded to a warn — that is what made this invisible.
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

/**
 * M1 — the copy on `/apply` may only claim the seat is sponsored when the
 * sponsorship is genuinely in force. `partnerType` says which QUESTIONS to
 * ask; it says nothing about who is paying. Phase B3 hardened `/enroll/<slug>`
 * against exactly this and the apply variant shipped without it.
 */
describe('resolveSchoolApplyPartner sponsorship state', () => {
  it('is in force for a sponsoring partner with no window and no cap', async () => {
    const { db, seatCounts } = stubDb(partnerRow());

    const resolved = await resolveSchoolApplyPartner('concordia-hs', { db, now: NOW });

    expect(resolved?.sponsorshipInForce).toBe(true);
    // No cap configured means no reason to count seats.
    expect(seatCounts).toHaveLength(0);
  });

  it('is NOT in force when the partner does not sponsor enrollment at all', async () => {
    const { db } = stubDb(partnerRow({ sponsoredEnrollment: false }));

    const resolved = await resolveSchoolApplyPartner('concordia-hs', { db, now: NOW });

    // Still the school variant — the questions are right — but no cost claim.
    expect(resolved).not.toBeNull();
    expect(resolved?.sponsorshipInForce).toBe(false);
  });

  it('is NOT in force before the window opens or after it closes', async () => {
    for (const [label, window] of [
      ['before', { sponsorshipStartsAt: new Date('2026-09-01T00:00:00Z') }],
      ['after', { sponsorshipEndsAt: new Date('2026-06-30T00:00:00Z') }],
    ] as const) {
      const { db } = stubDb(partnerRow(window));
      const resolved = await resolveSchoolApplyPartner('concordia-hs', { db, now: NOW });
      expect(resolved?.sponsorshipInForce, label).toBe(false);
    }
  });

  it('is NOT in force once the funded seats for the term are gone', async () => {
    const { db, seatCounts } = stubDb(partnerRow({ sponsorshipSeatCap: 40 }), { usedSeats: 40 });

    const resolved = await resolveSchoolApplyPartner('concordia-hs', { db, now: NOW });

    expect(resolved?.sponsorshipInForce).toBe(false);
    expect(seatCounts).toEqual([{ where: { sponsoredByPartnerId: 'partner-concordia' } }]);
  });

  it('is in force while seats remain under the cap', async () => {
    const { db } = stubDb(partnerRow({ sponsorshipSeatCap: 40 }), { usedSeats: 39 });

    const resolved = await resolveSchoolApplyPartner('concordia-hs', { db, now: NOW });

    expect(resolved?.sponsorshipInForce).toBe(true);
  });

  it('fails CLOSED when the seat count throws', async () => {
    // Under-claiming costs a little reassurance; over-claiming misrepresents
    // who is paying for a minor's training.
    const { db } = stubDb(partnerRow({ sponsorshipSeatCap: 40 }));
    db.courseEnrollment.count = async () => {
      throw new Error('connection lost');
    };

    const resolved = await resolveSchoolApplyPartner('concordia-hs', { db, now: NOW });

    expect(resolved?.sponsorshipInForce).toBe(false);
    expect(captureApiError).toHaveBeenCalledTimes(1);
  });
});
