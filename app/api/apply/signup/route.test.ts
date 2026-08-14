// @vitest-environment node
/**
 * Colocated route test for POST /api/apply/signup.
 *
 * Focus: the zod schema's ageGroup enum (Concordia HS launch adds 'under_18')
 * and that an accepted ageGroup lands in the created application's notes;
 * plus partner-sponsored enrollment stamping (Phase B2) — funding provenance
 * on CourseEnrollment, the soft seat cap, cookie-only partner refs, and the
 * school fields written for high-school partners.
 * All heavy dependencies (Supabase, Prisma, Resend email, rate limiting)
 * are mocked so the test exercises validation + the handler's data mapping.
 *
 * NOTE: collected by the default `pnpm test` run — this file is explicitly
 * included in vitest.config.ts alongside the tests/, lib/, components/ globs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PARTNER_REF_COOKIE } from '@/lib/apply/applyReferralCapture';

type PartnerRow = {
  id: string;
  name: string;
  partnerType: string;
  sponsoredEnrollment: boolean;
  sponsorshipFundingSource: string | null;
  sponsorshipTermLabel: string | null;
  sponsorshipStartsAt: Date | null;
  sponsorshipEndsAt: Date | null;
  sponsorshipSeatCap: number | null;
  schoolDistrict: string | null;
};

type UpsertArgs = { create: Record<string, unknown>; update: Record<string, unknown> };

const state = vi.hoisted(() => ({
  applicationCreates: [] as { data: { notes?: string | null } }[],
  /** Row returned by `partner.findFirst`; null means "no such partner". */
  partner: null as Record<string, unknown> | null,
  partnerLookups: [] as { where: { OR?: { referralCode?: string; slug?: string }[] } }[],
  /** Value `courseEnrollment.count` reports for already-sponsored seats. */
  sponsoredSeatCount: 0,
  enrollmentUpserts: [] as UpsertArgs[],
  enrollmentUpdateManys: [] as {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }[],
  profileUpserts: [] as UpsertArgs[],
  /** Request cookies visible to the route via `next/headers`. */
  cookies: {} as Record<string, string>,
}));

vi.mock('@/lib/rate-limit', () => ({
  checkApplySignupRateLimit: vi.fn(async () => ({ success: true })),
  checkSignupEmailRateLimit: vi.fn(async () => ({ success: true })),
}));

vi.mock('@/lib/turnstile/verifyTurnstile', () => ({
  verifyTurnstileResponse: vi.fn(async () => true),
}));

vi.mock('@/lib/db/prisma', () => {
  const tx = {
    user: {
      upsert: vi.fn(async () => ({})),
      findUnique: vi.fn(async () => null),
    },
    courseEnrollment: {
      upsert: vi.fn(async (args: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
        state.enrollmentUpserts.push(args);
        return {};
      }),
      count: vi.fn(async () => state.sponsoredSeatCount),
      updateMany: vi.fn(
        async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          state.enrollmentUpdateManys.push(args);
          return { count: 1 };
        }
      ),
    },
    profile: {
      upsert: vi.fn(async (args: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
        state.profileUpserts.push(args);
        return {};
      }),
    },
    application: {
      create: vi.fn(async (args: { data: { notes?: string | null } }) => {
        state.applicationCreates.push(args);
        return { id: 'app-test-1' };
      }),
    },
    applyEligibilityScreening: { upsert: vi.fn(async () => ({})) },
    partnerReferral: { create: vi.fn(async () => ({})) },
    partner: {
      findFirst: vi.fn(async (args: { where: { OR?: { referralCode?: string; slug?: string }[] } }) => {
        state.partnerLookups.push(args);
        return state.partner;
      }),
    },
  };
  return {
    prisma: {
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    },
  };
});

vi.mock('@/lib/content/programs', () => ({
  getProgramBySlug: vi.fn((slug: string) =>
    slug === 'it-support-professional-certificate-ibm'
      ? { slug, title: 'IT Support Professional Certificate (IBM)' }
      : null
  ),
}));

vi.mock('@prisma/client', () => ({
  ApplicationStatus: { PENDING: 'PENDING' },
}));

vi.mock('@/lib/events/track', () => ({
  trackEvent: vi.fn(async () => undefined),
}));

vi.mock('@/lib/analytics/conversionValue', () => ({
  getConversionValuePayload: vi.fn(() => ({})),
}));

vi.mock('@/lib/tenant/organization', () => ({
  getDefaultOrganizationId: vi.fn(async () => 'org-test-1'),
}));

vi.mock('@/lib/observability/captureApiError', () => ({
  captureApiError: vi.fn(),
}));

vi.mock('@/lib/observability/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: unknown) => handler,
}));

vi.mock('@/lib/db/withDbRetry', () => ({
  withDbRetry: vi.fn(async (fn: () => unknown) => fn()),
  isConnectionAcquisitionError: vi.fn(() => false),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    auth: { admin: { deleteUser: vi.fn(async () => ({ error: null })) } },
  })),
}));

vi.mock('@/lib/email', () => ({
  sendApplicationConfirmationEmail: vi.fn(async () => undefined),
  sendNewApplicationAdminEmail: vi.fn(async () => undefined),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => Object.entries(state.cookies).map(([name, value]) => ({ name, value })),
    get: (name: string) =>
      name in state.cookies ? { name, value: state.cookies[name] } : undefined,
    set: () => undefined,
  })),
}));

vi.mock('@/lib/supabaseCookieOptions', () => ({
  getSupabaseCookieOptions: vi.fn(() => ({})),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      signUp: vi.fn(async () => ({
        data: {
          user: { id: 'user-test-1', email: 'applicant@example.com' },
          session: null,
        },
        error: null,
      })),
    },
  })),
}));

import { POST } from './route';

function makeRequest(overrides: Record<string, unknown> = {}) {
  const body = {
    firstName: 'Concordia',
    lastName: 'Student',
    email: 'applicant@example.com',
    phone: '5125550199',
    password: 'Password123!',
    programRankedSlugs: ['it-support-professional-certificate-ibm'],
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    county: 'Travis',
    eligibilityQ1: 'yes',
    eligibilityQ2: 'yes',
    eligibilityQualifies: true,
    eligibilityYesCount: 2,
    ...overrides,
  };
  return new NextRequest('http://localhost:3000/api/apply/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function resetState() {
  state.applicationCreates.length = 0;
  state.partnerLookups.length = 0;
  state.enrollmentUpserts.length = 0;
  state.enrollmentUpdateManys.length = 0;
  state.profileUpserts.length = 0;
  state.partner = null;
  state.sponsoredSeatCount = 0;
  state.cookies = {};
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  delete process.env.NEXT_PUBLIC_CAPTCHA_ENABLED;
}

describe('POST /api/apply/signup ageGroup validation', () => {
  beforeEach(resetState);

  it('accepts ageGroup "under_18" and records it in application notes', async () => {
    const res = await POST(makeRequest({ ageGroup: 'under_18' }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { success?: boolean };
    expect(json.success).toBe(true);

    expect(state.applicationCreates).toHaveLength(1);
    expect(state.applicationCreates[0].data.notes).toContain('Age group: under_18');
  });

  it('still accepts the existing ageGroup values', async () => {
    for (const ageGroup of ['18_24', '25_50', '50_plus']) {
      state.applicationCreates.length = 0;
      const res = await POST(makeRequest({ ageGroup }));
      expect(res.status).toBe(200);
      expect(state.applicationCreates[0].data.notes).toContain(`Age group: ${ageGroup}`);
    }
  });

  it('rejects an invalid ageGroup like "under_13" with a 400', async () => {
    const res = await POST(makeRequest({ ageGroup: 'under_13' }));
    expect(res.status).toBe(400);
    expect(state.applicationCreates).toHaveLength(0);
  });

  it('accepts a missing ageGroup (optional field)', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(state.applicationCreates[0].data.notes ?? '').not.toContain('Age group:');
  });
});

/**
 * Phase B2: a partner with an active sponsorship stamps funding provenance
 * onto the enrollment it creates. Every assertion here also pins the negative
 * case — no ref, an inactive window, or a full seat cap must leave the
 * enrollment payload exactly as it was before this feature.
 */
describe('POST /api/apply/signup sponsored enrollment', () => {
  beforeEach(resetState);

  function sponsoringPartner(overrides: Partial<PartnerRow> = {}): PartnerRow {
    return {
      id: 'partner-concordia',
      name: 'Concordia High School',
      partnerType: 'community',
      sponsoredEnrollment: true,
      sponsorshipFundingSource: null,
      sponsorshipTermLabel: 'Fall 2026',
      sponsorshipStartsAt: null,
      sponsorshipEndsAt: null,
      sponsorshipSeatCap: null,
      schoolDistrict: null,
      ...overrides,
    };
  }

  function enrollmentCreate(): Record<string, unknown> {
    expect(state.enrollmentUpserts).toHaveLength(1);
    return state.enrollmentUpserts[0].create;
  }

  it('stamps funding source, notes, and sponsoring partner on the enrollment', async () => {
    state.partner = sponsoringPartner();

    const res = await POST(makeRequest({ referralRef: 'concordia-hs' }));
    expect(res.status).toBe(200);

    expect(enrollmentCreate()).toMatchObject({
      fundingSource: 'PARTNER_ORG',
      fundingNotes: 'Sponsored by Concordia High School (Fall 2026)',
      sponsoredByPartnerId: 'partner-concordia',
    });
    // Provenance is also carried on the update branch for a returning applicant.
    expect(state.enrollmentUpserts[0].update).toMatchObject({
      sponsoredByPartnerId: 'partner-concordia',
    });
  });

  it('never clobbers an admin-set funding source on an existing enrollment', async () => {
    state.partner = sponsoringPartner();

    await POST(makeRequest({ referralRef: 'concordia-hs' }));

    // The update branch deliberately omits fundingSource/fundingNotes; the
    // stamp lands via a null-scoped updateMany instead.
    expect(state.enrollmentUpserts[0].update).not.toHaveProperty('fundingSource');
    expect(state.enrollmentUpdateManys).toHaveLength(1);
    expect(state.enrollmentUpdateManys[0].where).toMatchObject({ fundingSource: null });
    expect(state.enrollmentUpdateManys[0].data).toMatchObject({
      fundingSource: 'PARTNER_ORG',
      fundingNotes: 'Sponsored by Concordia High School (Fall 2026)',
    });
  });

  it('honors the partner\'s explicit funding source', async () => {
    state.partner = sponsoringPartner({ sponsorshipFundingSource: 'GRANT' });

    await POST(makeRequest({ referralRef: 'concordia-hs' }));

    expect(enrollmentCreate()).toMatchObject({ fundingSource: 'GRANT' });
  });

  it('does not stamp when the sponsorship window has expired', async () => {
    state.partner = sponsoringPartner({
      sponsorshipStartsAt: new Date('2020-01-01T00:00:00Z'),
      sponsorshipEndsAt: new Date('2020-12-31T00:00:00Z'),
    });

    const res = await POST(makeRequest({ referralRef: 'concordia-hs' }));
    expect(res.status).toBe(200);

    const create = enrollmentCreate();
    expect(create).not.toHaveProperty('fundingSource');
    expect(create).not.toHaveProperty('fundingNotes');
    expect(create).not.toHaveProperty('sponsoredByPartnerId');
    expect(state.enrollmentUpdateManys).toHaveLength(0);
  });

  it('does not stamp for a partner that does not sponsor enrollment', async () => {
    state.partner = sponsoringPartner({ sponsoredEnrollment: false });

    const res = await POST(makeRequest({ referralRef: 'some-partner' }));
    expect(res.status).toBe(200);

    expect(enrollmentCreate()).not.toHaveProperty('sponsoredByPartnerId');
  });

  it('leaves the enrollment unstamped but the student enrolled when the seat cap is reached', async () => {
    state.partner = sponsoringPartner({ sponsorshipSeatCap: 25 });
    state.sponsoredSeatCount = 25;

    const res = await POST(makeRequest({ referralRef: 'concordia-hs' }));
    // Soft cap: a full cap must never error a student out of the funnel.
    expect(res.status).toBe(200);

    const create = enrollmentCreate();
    expect(create).not.toHaveProperty('fundingSource');
    expect(create).not.toHaveProperty('sponsoredByPartnerId');
    expect(state.enrollmentUpdateManys).toHaveLength(0);

    expect(state.applicationCreates[0].data.notes).toContain(
      'Seat cap reached for Concordia High School sponsorship — funding pending admin review'
    );
  });

  it('still stamps while seats remain under the cap', async () => {
    state.partner = sponsoringPartner({ sponsorshipSeatCap: 25 });
    state.sponsoredSeatCount = 24;

    await POST(makeRequest({ referralRef: 'concordia-hs' }));

    expect(enrollmentCreate()).toMatchObject({ sponsoredByPartnerId: 'partner-concordia' });
    expect(state.applicationCreates[0].data.notes ?? '').not.toContain('Seat cap reached');
  });

  it('resolves the partner from the ref cookie when the body carries none', async () => {
    state.partner = sponsoringPartner();
    state.cookies[PARTNER_REF_COOKIE] = 'concordia-hs';

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(state.partnerLookups).toHaveLength(1);
    expect(state.partnerLookups[0].where.OR).toEqual([
      { referralCode: 'concordia-hs' },
      { slug: 'concordia-hs' },
    ]);
    expect(enrollmentCreate()).toMatchObject({ sponsoredByPartnerId: 'partner-concordia' });
  });

  it('prefers the body ref over the cookie', async () => {
    state.partner = sponsoringPartner();
    state.cookies[PARTNER_REF_COOKIE] = 'stale-partner';

    await POST(makeRequest({ referralRef: 'Concordia-HS' }));

    expect(state.partnerLookups[0].where.OR).toEqual([
      { referralCode: 'concordia-hs' },
      { slug: 'concordia-hs' },
    ]);
  });

  it('looks up no partner at all when neither body nor cookie has a ref', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(state.partnerLookups).toHaveLength(0);
    expect(enrollmentCreate()).not.toHaveProperty('sponsoredByPartnerId');
  });

  it('records school name and district on the profile for a high_school partner', async () => {
    state.partner = sponsoringPartner({
      partnerType: 'high_school',
      schoolDistrict: 'Austin ISD',
    });

    const res = await POST(makeRequest({ referralRef: 'concordia-hs' }));
    expect(res.status).toBe(200);

    expect(state.profileUpserts).toHaveLength(1);
    expect(state.profileUpserts[0].create).toMatchObject({
      schoolName: 'Concordia High School',
      schoolDistrict: 'Austin ISD',
    });
    expect(state.profileUpserts[0].update).toMatchObject({
      schoolName: 'Concordia High School',
      schoolDistrict: 'Austin ISD',
    });
  });

  it('leaves the profile school fields untouched for a non-school partner', async () => {
    state.partner = sponsoringPartner({ partnerType: 'community' });

    await POST(makeRequest({ referralRef: 'concordia-hs' }));

    expect(state.profileUpserts[0].create).not.toHaveProperty('schoolName');
    expect(state.profileUpserts[0].update).not.toHaveProperty('schoolDistrict');
  });
});
