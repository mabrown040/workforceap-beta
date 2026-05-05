import { authorizeCronRequest } from '@/lib/cron/authorizeCronRequest';

/**
 * Hourly public endpoint smoke test.
 *
 * HTTP checks on critical public paths to catch 500s/404s from bad deploys.
 */

const ENDPOINTS = [
  { path: '/login', name: 'login' },
  { path: '/apply', name: 'apply' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/employer', name: 'employer' },
  { path: '/partner', name: 'partner' },
  { path: '/programs', name: 'programs' },
  { path: '/faq', name: 'faq' },
];

async function handle(request: Request) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) return unauthorized;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.workforceap.org';
  const results: Record<string, { ok: boolean; status: number; bytes: number }> = {};

  for (const ep of ENDPOINTS) {
    try {
      const res = await fetch(`${baseUrl}${ep.path}`, { method: 'GET' });
      const body = await res.text();
      results[ep.name] = {
        ok: res.status === 200,
        status: res.status,
        bytes: body.length,
      };
    } catch (err) {
      results[ep.name] = {
        ok: false,
        status: 0,
        bytes: 0,
      };
    }
  }

  const allOk = Object.values(results).every((r) => r.ok);
  const failed = Object.entries(results)
    .filter(([, r]) => !r.ok)
    .map(([name]) => name);

  const result = {
    ok: allOk,
    checked: ENDPOINTS.length,
    failed,
    results,
    checkedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(result));
  return Response.json(result);
}

export const GET = handle;
export const POST = handle;
