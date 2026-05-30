import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
import { __resetHealthCache } from '@/app/api/health/_healthCache';
import { prisma } from '@/lib/db/prisma';
import { checkPublicHealthRateLimit } from '@/lib/rate-limit';

describe('GET /api/health', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    __resetHealthCache();
    vi.mocked(checkPublicHealthRateLimit).mockResolvedValue({ success: true });
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);

    process.env = {
      ...OLD_ENV,
      VERCEL_GIT_COMMIT_SHA: 'abc123def',
      VERCEL_ENV: 'production',
    };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('returns ok when database is healthy and redis/s3 are skipped', async () => {
    const res = await healthGET(new Request('http://localhost:3000/api/health'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.version).toBe('abc123d');
    expect(body.timestamp).toBeDefined();
    expect(body.checks.database.status).toBe('ok');
    expect(body.checks.redis.status).toBe('skipped');
    expect(body.checks.s3.status).toBe('skipped');
  });

  it('returns degraded when redis is configured but fails', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    // @upstash/redis ping will fail because module is not really loaded in test context
    // (it will throw), so redis status becomes degraded.
    const res = await healthGET(new Request('http://localhost:3000/api/health'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('degraded');
    expect(body.checks.database.status).toBe('ok');
    expect(body.checks.redis.status).toBe('degraded');
  });

  it('returns 503 when database is down', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Connection refused'));

    const res = await healthGET(new Request('http://localhost:3000/api/health'));

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe('fail');
    expect(body.checks.database.status).toBe('degraded');
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(checkPublicHealthRateLimit).mockResolvedValue({ success: false });

    const res = await healthGET(new Request('http://localhost:3000/api/health'));

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'Too many requests' });
  });

  it('includes responseTimeMs when deep=true', async () => {
    const res = await healthGET(new Request('http://localhost:3000/api/health?deep=true'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checks.database.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(body.checks.redis.responseTimeMs).toBeUndefined();
    expect(body.checks.s3.responseTimeMs).toBeUndefined();
  });

  it('returns local version when not on Vercel', async () => {
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    delete process.env.VERCEL_ENV;
    (process.env as { NODE_ENV?: string }).NODE_ENV = 'development';

    const res = await healthGET(new Request('http://localhost:3000/api/health'));

    const body = await res.json();
    expect(body.version).toBe('local');
  });

  it('includes max-age=5 cache header', async () => {
    const res = await healthGET(new Request('http://localhost:3000/api/health'));

    expect(res.headers.get('Cache-Control')).toBe('max-age=5');
  });
});

describe('OPTIONS /api/health', () => {
  it('returns 204 with CORS headers', async () => {
    const res = await healthOPTIONS();

    expect(res.status).toBe(204);
  });
});
