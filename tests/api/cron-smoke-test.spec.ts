import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───
vi.mock('@/lib/admin/logCronRun', () => ({
  logCronRun: vi.fn(),
}));

vi.mock('@/lib/cron/cronExecution', () => ({
  setCronRecordsProcessed: vi.fn(),
  startCronExecution: vi.fn().mockResolvedValue('exec-id'),
  completeCronExecution: vi.fn(),
  runWithCronExecution: vi.fn(async (_id, fn) => fn()),
}));

vi.mock('@/lib/cron/authorizeCronRequest', () => ({
  authorizeCronRequest: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/cron/isCronEnabled', () => ({
  isCronEnabled: vi.fn().mockResolvedValue(true),
}));

// ─── Imports after mocks ───
import { GET as smokeGET } from '@/app/api/cron/smoke-test/route';
import { logCronRun } from '@/lib/admin/logCronRun';

describe('GET /api/cron/smoke-test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://test.workforceap.org');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns ok when all endpoints respond with 200', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      text: vi.fn().mockResolvedValue('ok body'),
    });

    const res = await smokeGET(new Request('http://localhost:3000/api/cron/smoke-test'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.checked).toBe(7);
    expect(json.failed).toEqual([]);
  });

  it('reports failures when endpoints return non-200', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/login')) {
        return Promise.resolve({ status: 200, text: () => Promise.resolve('ok') });
      }
      return Promise.resolve({ status: 500, text: () => Promise.resolve('error') });
    });

    const res = await smokeGET(new Request('http://localhost:3000/api/cron/smoke-test'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.failed.length).toBeGreaterThan(0);
    expect(json.failed).not.toContain('login');
  });

  it('handles network errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

    const res = await smokeGET(new Request('http://localhost:3000/api/cron/smoke-test'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.failed.length).toBe(7);
    expect(json.results.login.ok).toBe(false);
    expect(json.results.login.status).toBe(0);
  });

  it('logs cron run on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      text: vi.fn().mockResolvedValue('ok'),
    });

    await smokeGET(new Request('http://localhost:3000/api/cron/smoke-test'));
    expect(logCronRun).toHaveBeenCalledWith(
      'cron_smoke_test',
      expect.objectContaining({ ok: true }),
      'ok'
    );
  });

  it('logs cron run with error when endpoints fail', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 500,
      text: vi.fn().mockResolvedValue('error'),
    });

    await smokeGET(new Request('http://localhost:3000/api/cron/smoke-test'));
    expect(logCronRun).toHaveBeenCalledWith(
      'cron_smoke_test',
      expect.objectContaining({ ok: false }),
      'error'
    );
  });
});
