import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';

/**
 * GET /api/admin/cron-health
 *
 * Returns cron infrastructure health:
 * - cronSecretConfigured: whether CRON_SECRET is set
 * - siteUrl: the origin used for manual triggers
 * - vercelCronsConfigured: whether vercel.json has crons array
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { await requireAdmin(user.id); } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const cronSecret = process.env.CRON_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.workforceap.org';

  // Check vercel.json for crons array
  let vercelCronsConfigured = false;
  try {
    const vercelConfig = await import('@/vercel.json');
    vercelCronsConfigured = Array.isArray(vercelConfig?.crons) && vercelConfig.crons.length > 0;
  } catch {
    vercelCronsConfigured = false;
  }

  return NextResponse.json({
    cronSecretConfigured: Boolean(cronSecret && cronSecret.length >= 16),
    cronSecretLength: cronSecret ? `${cronSecret.length} chars` : 'not set',
    siteUrl,
    vercelCronsConfigured,
    nextSteps: !cronSecret
      ? 'Add CRON_SECRET to Vercel environment variables (Production). Value must be at least 16 chars. Redeploy required.'
      : vercelCronsConfigured
        ? 'All green. Crons should run on schedule.'
        : 'CRON_SECRET is set but vercel.json may be missing crons. Check vercel.json.',
  });
}
