import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser, isSuperAdmin } from '@/lib/auth/roles';
import { withDbRetry } from '@/lib/db/withDbRetry';

/** Paths where we skip partner→/partner redirect (dedicated shells or legacy redirects). */
const SKIP_PREFIXES = [
  '/partner',
  '/employer',
  '/counselor',
  '/admin',
  '/certifications',
  '/profile',
  '/resources',
  '/help',
  '/account',
  '/dashboard/help',
  '/dashboard/account',
  '/dashboard/career-library',
];

/**
 * Partner-only accounts should not use member portal surfaces. Redirect server-side
 * so we avoid a flash of member UI (client redirect in PortalShell is then redundant).
 */
export default async function PartnerExclusiveServerGate() {
  const pathname = (await headers()).get('x-pathname') ?? '';
  if (SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  const user = await getUser();
  if (!user) return null;

  try {
    const superAdmin = await withDbRetry(() => isSuperAdmin(user.id));
    const partnerCtx = await withDbRetry(() =>
      getPartnerForUser(user.id, { isSuperAdminHint: superAdmin }),
    );
    if (partnerCtx && !superAdmin) {
      redirect('/partner');
    }
  } catch (e) {
    console.error('[PartnerExclusiveServerGate] role lookup failed', e);
    /* Fail open: allow member UI when DB is unavailable; partner redirect is best-effort */
  }

  return null;
}
