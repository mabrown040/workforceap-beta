import { authorizeCronRequest } from '@/lib/cron/authorizeCronRequest';

/**
 * Hourly Vercel deploy health check.
 *
 * Queries the Vercel API to verify the latest production deployment
 * is in READY state, not ERROR or CANCELED.
 */

async function handle(request: Request) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) return unauthorized;

  const projectId = process.env.VERCEL_PROJECT_ID || 'prj_pfOpwxedCID96oF2hlaE5J7kbNid';
  const teamId = process.env.VERCEL_TEAM_ID || 'team_zTfMkbIIH6ADgy5Hy43MCM5K';
  const token = process.env.VERCEL_TOKEN;

  if (!token) {
    return Response.json({ ok: false, error: 'VERCEL_TOKEN missing' }, { status: 500 });
  }

  const res = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${projectId}&target=production&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    return Response.json({ ok: false, error: 'Vercel API error', status: res.status }, { status: 502 });
  }

  const data = await res.json();
  const latest = data.deployments?.[0];

  const result = {
    ok: latest?.readyState === 'READY',
    readyState: latest?.readyState,
    url: latest?.url,
    commit: latest?.meta?.githubCommitSha,
    checkedAt: new Date().toISOString(),
  };

  // Log to stdout for cron run tracking
  console.log(JSON.stringify(result));
  return Response.json(result);
}

export const GET = handle;
export const POST = handle;
