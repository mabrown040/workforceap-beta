// @vitest-environment node
/**
 * Colocated route test for POST /api/apply/signup.
 *
 * Focus: the zod schema's ageGroup enum (Concordia HS launch adds 'under_18')
 * and that an accepted ageGroup lands in the created application's notes.
 * All heavy dependencies (Supabase, Prisma, Resend email, rate limiting)
 * are mocked so the test exercises validation + the handler's data mapping.
 *
 * NOTE: collected by the default `pnpm test` run — this file is explicitly
 * included in vitest.config.ts alongside the tests/, lib/, components/ globs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  applicationCreates: [] as { data: { notes?: string | null } }[],
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
    courseEnrollment: { upsert: vi.fn(async () => ({})) },
    profile: { upsert: vi.fn(async () => ({})) },
    application: {
      create: vi.fn(async (args: { data: { notes?: string | null } }) => {
        state.applicationCreates.push(args);
        return { id: 'app-test-1' };
      }),
    },
    applyEligibilityScreening: { upsert: vi.fn(async () => ({})) },
    partnerReferral: { create: vi.fn(async () => ({})) },
    partner: { findFirst: vi.fn(async () => null) },
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
  cookies: vi.fn(async () => ({ getAll: () => [], set: () => undefined })),
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

describe('POST /api/apply/signup ageGroup validation', () => {
  beforeEach(() => {
    state.applicationCreates.length = 0;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    delete process.env.NEXT_PUBLIC_CAPTCHA_ENABLED;
  });

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
