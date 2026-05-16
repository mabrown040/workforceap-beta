import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───
vi.mock('next/server', () => ({
  NextResponse: class extends Response {
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      super(body ?? null, init);
    }
    static json(body: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      });
    }
  },
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock('@/lib/http/clientIp', () => ({
  getClientIpFromRequest: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/http/publicApiCors', () => ({
  publicApiCorsHeaders: vi.fn(() => ({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  })),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkPublicHealthRateLimit: vi.fn(),
}));

vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: (request: Request) => Promise<Response>) => handler,
}));

// ─── Imports after mocks ───
import { GET as healthGET, OPTIONS as healthOPTIONS } from '@/app/api/health/route';
import { prisma } from '@/lib/db/prisma';
import { checkPublicHealthRateLimit } from '@/lib/rate-limit';

describe('GET /api/health', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkPublicHealthRateLimit).mockResolvedValue({ success: true });
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);

    process.env = {
      ...OLD_ENV,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
      RESEND_API_KEY: 'test-resend-key',
      XAPI_CLIENT_ID: 'workforceap-xapi',
      XAPI_CLIENT_SECRET: 'xapi-secret',
      NEXT_PUBLIC_CAPTCHA_ENABLED: 'false',
      SENTRY_DSN: 'https://sentry.example.com',
      VERCEL_GIT_COMMIT_SHA: 'abc123def',
      VERCEL_ENV: 'production',
    };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('returns healthy status when all dependencies are ok', async () => {
    const res = await healthGET(new Request('http://localhost:3000/api/health'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.environment).toBe('production');
    expect(body.version).toBe('abc123d');
    expect(body.dependencies).toHaveLength(6);
    expect(body.dependencies.find((d: any) => d.name === 'database')?.status).toBe('ok');
    expect(body.dependencies.find((d: any) => d.name === 'supabase')?.status).toBe('ok');
    expect(body.dependencies.find((d: any) => d.name === 'email_resend')?.status).toBe('ok');
  });

  it('returns degraded when non-critical dependency fails', async () => {
    process.env.NEXT_PUBLIC_CAPTCHA_ENABLED = 'true';
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '';
    process.env.TURNSTILE_SECRET_KEY = '';

    const res = await healthGET(new Request('http://localhost:3000/api/health'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('degraded');
    const captchaDep = body.dependencies.find((d: any) => d.name === 'captcha_turnstile');
    expect(captchaDep.status).toBe('fail');
  });

  it('returns fail when database is down', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Connection refused'));

    const res = await healthGET(new Request('http://localhost:3000/api/health'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('fail');
    const dbDep = body.dependencies.find((d: any) => d.name === 'database');
    expect(dbDep.status).toBe('fail');
    expect(dbDep.note).toContain('unreachable');
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(checkPublicHealthRateLimit).mockResolvedValue({ success: false });

    const res = await healthGET(new Request('http://localhost:3000/api/health'));

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'Too many requests' });
  });

  it('reports captcha as skipped when disabled', async () => {
    const res = await healthGET(new Request('http://localhost:3000/api/health'));

    const body = await res.json();
    const captchaDep = body.dependencies.find((d: any) => d.name === 'captcha_turnstile');
    expect(captchaDep.status).toBe('skipped');
  });

  it('reports captcha as fail when enabled but misconfigured', async () => {
    process.env.NEXT_PUBLIC_CAPTCHA_ENABLED = 'true';
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '';
    process.env.TURNSTILE_SECRET_KEY = '';

    const res = await healthGET(new Request('http://localhost:3000/api/health'));

    const body = await res.json();
    const captchaDep = body.dependencies.find((d: any) => d.name === 'captcha_turnstile');
    expect(captchaDep.status).toBe('fail');
  });

  it('reports missing coursera config', async () => {
    delete process.env.XAPI_CLIENT_ID;
    delete process.env.XAPI_CLIENT_SECRET;

    const res = await healthGET(new Request('http://localhost:3000/api/health'));

    const body = await res.json();
    const courseraDep = body.dependencies.find((d: any) => d.name === 'coursera_xapi');
    expect(courseraDep.status).toBe('not_configured');
    expect(courseraDep.note).toContain('XAPI client secret');
  });

  it('returns local version when not on Vercel', async () => {
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';

    const res = await healthGET(new Request('http://localhost:3000/api/health'));

    const body = await res.json();
    expect(body.version).toBe('local');
    expect(body.environment).toBe('development');
  });

  it('includes Cache-Control no-store header', async () => {
    const res = await healthGET(new Request('http://localhost:3000/api/health'));

    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('OPTIONS /api/health', () => {
  it('returns 204 with CORS headers', async () => {
    const res = await healthOPTIONS();

    expect(res.status).toBe(204);
  });
});
