// @vitest-environment node
/** Real handler/schema; Supabase, member persistence, rate limits, and telemetry
 * are mocked. This proves response orchestration, not account/email persistence. */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  createMember: vi.fn(),
  findUser: vi.fn(),
  deleteUser: vi.fn(),
  checkSignupRateLimit: vi.fn(),
  checkSignupEmailRateLimit: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { signUp: mocks.signUp } }) }));
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }));
vi.mock('@/lib/member/service', () => ({ createMember: mocks.createMember }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { user: { findUnique: mocks.findUser } } }));
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: () => ({ auth: { admin: { deleteUser: mocks.deleteUser } } }) }));
vi.mock('@/lib/rate-limit', () => ({
  checkSignupRateLimit: mocks.checkSignupRateLimit,
  checkSignupEmailRateLimit: mocks.checkSignupEmailRateLimit,
}));
vi.mock('@/lib/turnstile/verifyTurnstile', () => ({ verifyTurnstileResponse: vi.fn() }));
vi.mock('@/lib/events/track', () => ({ trackEvent: mocks.trackEvent }));

import { POST } from '@/app/api/member/signup/route';

const requiredFields = {
  fullName: 'Test User',
  email: 'Test@Example.com',
  password: 'Password1',
  programInterest: 'Digital Literacy Empowerment Class (6 weeks, 30 hours total)',
  consentTerms: true,
  consentCommunications: false,
};

function request(body: Record<string, unknown> = requiredFields) {
  return new NextRequest('http://localhost:3000/api/member/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  // Synthetic values satisfy config checks; every provider boundary is mocked.
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.invalid');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
  vi.stubEnv('POSTGRES_PRISMA_URL', '');
  vi.stubEnv('NEXT_PUBLIC_CAPTCHA_ENABLED', 'false');
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected network call in hermetic signup test'); }));
  mocks.checkSignupRateLimit.mockResolvedValue({ success: true });
  mocks.checkSignupEmailRateLimit.mockResolvedValue({ success: true });
  mocks.signUp.mockResolvedValue({
    data: { user: { id: 'new-member-id', identities: [{ id: 'email-identity' }] } },
    error: null,
  });
  mocks.findUser.mockResolvedValue(null);
  mocks.createMember.mockResolvedValue(undefined);
  mocks.deleteUser.mockResolvedValue({ error: null });
  mocks.trackEvent.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /api/member/signup response contract (mocked providers)', () => {
  it('returns the email-verification response after provisioning without phone or ZIP', async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: 'Check your email to verify your account.',
    });
    expect(mocks.signUp).toHaveBeenCalledExactlyOnceWith({
      email: 'test@example.com',
      password: 'Password1',
      options: {
        data: { full_name: 'Test User', phone: undefined },
        emailRedirectTo: 'http://localhost:3000/auth/callback',
      },
    });
    expect(mocks.createMember).toHaveBeenCalledExactlyOnceWith('new-member-id', {
      ...requiredFields,
      email: 'test@example.com',
    });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('rejects missing terms consent before contacting an identity or member provider', async () => {
    const response = await POST(request({ ...requiredFields, consentTerms: false }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'You must agree to the terms and privacy policy' });
    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(mocks.createMember).not.toHaveBeenCalled();
    expect(mocks.trackEvent).not.toHaveBeenCalled();
  });

  it('returns an error when the identity provider rejects signup without reporting success', async () => {
    mocks.signUp.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'User already registered', code: 'user_already_exists' },
    });
    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'An account with this email may already exist. Try logging in or resetting your password.',
    });
    expect(mocks.createMember).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    expect(mocks.trackEvent).not.toHaveBeenCalled();
  });

  it('returns an error when member provisioning fails and cleans up only the mocked new identity', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.createMember.mockRejectedValueOnce(new Error('Simulated persistence failure'));
    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Account creation failed. Please try again.' });
    expect(mocks.createMember).toHaveBeenCalledTimes(1);
    expect(mocks.deleteUser).toHaveBeenCalledExactlyOnceWith('new-member-id');
    expect(mocks.trackEvent).not.toHaveBeenCalled();
  });
});
