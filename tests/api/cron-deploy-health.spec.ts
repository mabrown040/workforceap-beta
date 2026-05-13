import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/admin/logCronRun', () => ({
  logCronRun: vi.fn(),
}));

vi.mock('@/lib/cron/withCronLogging', () => ({
  withCronLogging: vi.fn((_key, handler) => handler),
}));

vi.mock('@/lib/cron/cronExecution', () => ({
  setCronRecordsProcessed: vi.fn(),
}));

import { GET } from '@/app/api/cron/deploy-health/route';
import { logCronRun } from '@/lib/admin/logCronRun';

describe('GET /api/cron/deploy-health', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VERCEL_TOKEN', 'test-token');
    vi.stubEnv('VERCEL_PROJECT_ID', 'prj_test');
    vi.stubEnv('VERCEL_TEAM_ID', 'team_test');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://test.workforceap.org');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    global.fetch = originalFetch;
  });

  it('returns ok when latest deployment is READY', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          deployments: [
            {
              readyState: 'READY',
              url: 'wap.vercel.app',
              meta: { githubCommitSha: 'abc123' },
            },
          ],
        }),
    });

    const res = await GET(new Request('http://localhost/api/cron/deploy-health'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.readyState).toBe('READY');
    expect(json.commit).toBe('abc123');
    expect(logCronRun).toHaveBeenCalledWith(
      'cron_deploy_health',
      expect.objectContaining({ ok: true }),
      'ok',
    );
  });

  it('returns not-ok when latest deployment is not READY', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ deployments: [{ readyState: 'BUILDING' }] }),
    });

    const res = await GET(new Request('http://localhost/api/cron/deploy-health'));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.readyState).toBe('BUILDING');
    expect(logCronRun).toHaveBeenCalledWith(
      'cron_deploy_health',
      expect.anything(),
      'error',
    );
  });

  it('falls back to site health when VERCEL_TOKEN is missing', async () => {
    vi.stubEnv('VERCEL_TOKEN', '');
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    const res = await GET(new Request('http://localhost/api/cron/deploy-health'));
    const json = await res.json();
    expect(json.degraded).toBe(true);
    expect(json.fallback).toBe('site-health');
    expect(json.reason).toContain('VERCEL_TOKEN');
    expect(json.ok).toBe(true);
  });

  it('falls back when Vercel API returns non-ok', async () => {
    global.fetch = vi
      .fn()
      // first call: Vercel API
      .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({}) })
      // second call: site fallback
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const res = await GET(new Request('http://localhost/api/cron/deploy-health'));
    const json = await res.json();
    expect(json.fallback).toBe('site-health');
    expect(json.reason).toBe('Vercel API error');
    expect(json.status).toBe(401);
  });

  it('returns 502 from fallback when site is also down', async () => {
    vi.stubEnv('VERCEL_TOKEN', '');
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });

    const res = await GET(new Request('http://localhost/api/cron/deploy-health'));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.siteStatus).toBe(503);
  });
});
