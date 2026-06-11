import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';

// ─── Mocks ───

vi.mock('next/server', () => {
  class MockNextRequest extends Request {
    cookies = {
      get: vi.fn(),
      getAll: vi.fn(() => []),
      set: vi.fn(),
      delete: vi.fn(),
    };

    get nextUrl() {
      return new URL(this.url);
    }
  }

  class MockNextResponse extends Response {
    cookies = {
      set: vi.fn(),
      get: vi.fn(),
      getAll: vi.fn(() => []),
      delete: vi.fn(),
    };

    static json(body: unknown, init?: ResponseInit) {
      return new MockNextResponse(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      });
    }

    static redirect(url: URL | string, status = 302) {
      const headers = new Headers();
      headers.set('location', typeof url === 'string' ? url : url.href);
      return new MockNextResponse(null, { status, headers });
    }

    static rewrite(url: URL | string, init?: any) {
      const headers = new Headers(init?.request?.headers);
      headers.set('x-middleware-rewrite', typeof url === 'string' ? url : url.href);
      return new MockNextResponse(null, { status: 200, headers });
    }

    static next(init?: any) {
      const headers = new Headers(init?.request?.headers);
      return new MockNextResponse(null, { status: 200, headers });
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn(),
        listFactors: vi.fn(),
      },
    },
  })),
}));

vi.mock('@/lib/employer/service', () => ({
  createEmployerUser: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkPartnerSignupRateLimit: vi.fn(),
  checkSignupEmailRateLimit: vi.fn(),
  checkAuthRateLimit: vi.fn(),
  checkAuthIpRateLimit: vi.fn(),
}));

vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: (request: Request) => Promise<Response>) => handler,
}));

vi.mock('@/lib/email', () => ({
  sendEmployerWelcomeEmail: vi.fn(),
  sendEmployerSignupAdminAlertEmail: vi.fn(),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/supabaseCookieOptions', () => ({
  getSupabaseCookieOptions: vi.fn(() => ({
    path: '/',
    sameSite: 'lax',
    secure: false,
  })),
  SESSION_ONLY_COOKIE: 'wa_session_only',
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    profile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/mfaTrust', () => ({
  getAdminMfaTrustCookieName: vi.fn(() => 'wap_mfa_trust'),
  verifyAdminMfaTrustToken: vi.fn(),
}));

vi.mock('@/lib/auth/mfaConfig', () => ({
  isStaffMfaEnforcementEnabled: vi.fn(() => false),
}));

vi.mock('@/lib/tenant/customDomainCache', () => ({
  customDomainCache: {
    get: vi.fn(),
  },
  NO_ORG_SENTINEL: '___NONE___',
}));

vi.mock('@/lib/tenant/hostMatch', () => ({
  isCanonicalHost: vi.fn(() => true),
  normalizeHost: vi.fn(() => 'localhost:3000'),
}));

vi.mock('@/lib/nav/mobileBottomNavLayout', () => ({
  WAP_RESERVE_MOBILE_BOTTOM_NAV_HEADER: 'x-wap-reserve-mobile-nav',
  shouldReserveMobileBottomNavClearance: vi.fn(() => false),
}));

vi.mock('@/lib/i18n/config', () => {
  const splitLocalePrefix = (pathname: string) => {
    const match = pathname.match(/^\/(en|es)(?:\/|$)/);
    if (match) {
      return { locale: match[1], pathnameWithoutLocale: pathname.slice(match[1].length + 1) || '/' };
    }
    return { locale: null, pathnameWithoutLocale: pathname };
  };
  return {
    WAP_LOCALE_COOKIE: 'wap_locale',
    WAP_LOCALE_HEADER: 'x-wap-locale',
    isAppLocale: vi.fn(() => false),
    isLocaleBypassPath: vi.fn(() => false),
    isLocaleableMarketingPath: vi.fn(() => false),
    pickLocaleFromAcceptLanguage: vi.fn(() => 'en'),
    splitLocalePrefix,
    withLocalePrefix: vi.fn((pathname: string) => `/en${pathname}`),
  };
});

// ─── Imports after mocks ───
import { POST as employerSignupPost } from '@/app/api/employer/signup/route';
import { POST as loginPost } from '@/app/api/auth/login/route';
import { middleware } from '@/middleware';
import { createServerClient } from '@supabase/ssr';
import { createEmployerUser } from '@/lib/employer/service';
import {
  checkAuthIpRateLimit,
  checkAuthRateLimit,
  checkPartnerSignupRateLimit,
  checkSignupEmailRateLimit,
} from '@/lib/rate-limit';
import { sendEmployerWelcomeEmail, sendEmployerSignupAdminAlertEmail } from '@/lib/email';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { prisma } from '@/lib/db/prisma';
import { NextRequest } from 'next/server';

const UUIDS = {
  user: '550e8400-e29b-41d4-a716-446655440001',
  org: '550e8400-e29b-41d4-a716-446655440002',
};

function makeSignupRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/employer/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeLoginRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-wap-login-flow': 'client',
    },
    body: JSON.stringify(body),
  });
}

function mockSupabaseAdmin() {
  const createUser = vi.fn().mockResolvedValue({
    data: { user: { id: UUIDS.user, email: 'jane@acme.com' } },
    error: null,
  });
  const signInWithPassword = vi.fn();
  vi.mocked(getSupabaseAdmin).mockReturnValue({
    auth: {
      admin: {
        createUser,
      },
    },
  } as any);
  vi.mocked(createServerClient).mockReturnValue({
    auth: {
      signUp: vi.fn(),
      signInWithPassword: signInWithPassword.mockResolvedValue({
        data: { session: { access_token: 'tok', refresh_token: 'ref' } },
        error: null,
      }),
      getUser: vi.fn(),
      getSession: vi.fn(),
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn(),
        listFactors: vi.fn(),
      },
    },
  } as any);
  return { createUser, signInWithPassword };
}

// ─────────────────────────────────────────────
// POST /api/employer/signup
// ─────────────────────────────────────────────
// Set required env vars for tests
const ORIGINAL_ENV = { ...process.env };
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.POSTGRES_PRISMA_URL = 'postgresql://test';
});
afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('POST /api/employer/signup', () => {
  const validPayload = {
    companyName: 'Acme Corp',
    contactName: 'Jane Doe',
    email: 'jane@acme.com',
    phone: '512-555-0100',
    industry: 'Technology',
    companySize: '11-50',
    rolesHiring: 'Software engineers',
    hearAbout: 'Referral',
    password: 'Secret1!',
    consentTerms: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkPartnerSignupRateLimit).mockResolvedValue({ success: true });
    vi.mocked(checkSignupEmailRateLimit).mockResolvedValue({ success: true });
    vi.mocked(createEmployerUser).mockResolvedValue(undefined);
    vi.mocked(sendEmployerWelcomeEmail).mockResolvedValue({ ok: true });
    vi.mocked(sendEmployerSignupAdminAlertEmail).mockResolvedValue({ ok: true });
  });

  it('creates an unconfirmed employer account without signing the user in', async () => {
    const { createUser, signInWithPassword } = mockSupabaseAdmin();

    const res = await employerSignupPost(makeSignupRequest(validPayload));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.redirectTo).toBeUndefined();
    expect(body.message).toContain('verify your account');

    expect(createUser).toHaveBeenCalledWith(
      expect.not.objectContaining({
        email_confirm: true,
      })
    );
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'jane@acme.com',
        password: 'Secret1!',
      })
    );
    expect(signInWithPassword).not.toHaveBeenCalled();

    expect(createEmployerUser).toHaveBeenCalledWith(
      UUIDS.user,
      expect.objectContaining({
        email: 'jane@acme.com',
        companyName: 'Acme Corp',
        contactName: 'Jane Doe',
      })
    );
    expect(sendEmployerWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@acme.com',
        companyName: 'Acme Corp',
        contactName: 'Jane Doe',
      })
    );
    expect(sendEmployerSignupAdminAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        companyName: 'Acme Corp',
        contactName: 'Jane Doe',
        contactEmail: 'jane@acme.com',
      })
    );
  });

  it('returns 400 for duplicate email', async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'User already registered', code: 'user_already_exists' },
          }),
        },
      },
    } as any);

    const res = await employerSignupPost(makeSignupRequest(validPayload));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('already exist');
    expect(createEmployerUser).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid data validation', async () => {
    const invalidPayload = {
      companyName: '',
      contactName: '',
      email: 'not-an-email',
      phone: 'abc',
      password: 'short',
      consentTerms: false,
    };

    const res = await employerSignupPost(makeSignupRequest(invalidPayload));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
    expect(createEmployerUser).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(checkPartnerSignupRateLimit).mockResolvedValue({ success: false });

    const res = await employerSignupPost(makeSignupRequest(validPayload));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain('Too many signup attempts');
    expect(createEmployerUser).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost:3000/api/employer/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });

    const res = await employerSignupPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request body');
  });

  it('returns 500 when createEmployerUser throws', async () => {
    mockSupabaseAdmin();
    vi.mocked(createEmployerUser).mockRejectedValue(new Error('DB error'));

    const res = await employerSignupPost(makeSignupRequest(validPayload));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Account creation failed');
  });
});

// ─────────────────────────────────────────────
// Employer auth flow
// ─────────────────────────────────────────────
describe('Employer auth flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkAuthRateLimit).mockResolvedValue({ success: true });
    vi.mocked(checkAuthIpRateLimit).mockResolvedValue({ success: true });
  });

  it('login redirects to /employer when redirectTo is set', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            session: { access_token: 'tok', refresh_token: 'ref' },
            user: { id: UUIDS.user, email: 'employer@acme.com' },
          },
          error: null,
        }),
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: UUIDS.user, email: 'employer@acme.com' } } }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
        mfa: {
          getAuthenticatorAssuranceLevel: vi.fn(),
          listFactors: vi.fn(),
        },
      },
    } as any);

    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      role: 'employer',
    } as any);

    const res = await loginPost(
      makeLoginRequest({
        email: 'employer@acme.com',
        password: 'Secret1!',
        redirectTo: '/employer',
        rememberMe: false,
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.redirectTo).toBe('/employer');
  });

  it('unauthenticated access to /employer/jobs redirects to login', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        mfa: {
          getAuthenticatorAssuranceLevel: vi.fn(),
          listFactors: vi.fn(),
        },
      },
    } as any);

    const req = new NextRequest('http://localhost:3000/employer/jobs', {
      method: 'GET',
    });

    const res = await middleware(req);
    expect(res.status).toBe(302);
    const location = res.headers.get('location');
    expect(location).toContain('/login');
    expect(location).toContain('redirectTo=' + encodeURIComponent('/employer/jobs'));
  });

  it('allows authenticated access to /employer/jobs', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: UUIDS.user, email: 'employer@acme.com' } },
        }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'tok' } },
        }),
        mfa: {
          getAuthenticatorAssuranceLevel: vi.fn(),
          listFactors: vi.fn(),
        },
      },
    } as any);

    const req = new NextRequest('http://localhost:3000/employer/jobs', {
      method: 'GET',
    });

    const res = await middleware(req);
    expect(res.status).toBe(200);
    const location = res.headers.get('location');
    expect(location).toBeNull();
  });
});
