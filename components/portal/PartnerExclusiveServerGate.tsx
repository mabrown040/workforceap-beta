import { headers } from 'next/headers';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser, isSuperAdmin } from '@/lib/auth/roles';

const SKIP_PREFIXES = ['/partner', '/employer', '/counselor', '/admin', '/certifications', '/profile'];

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
    const [partnerCtx, superAdmin] = await Promise.all([getPartnerForUser(user.id), isSuperAdmin(user.id)]);
    if (partnerCtx && !superAdmin) {
      redirect('/partner');
    }
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error('[PartnerExclusiveServerGate] role lookup failed', e);
    /* Fail open: allow member UI when DB is unavailable; partner redirect is best-effort */
  }

  return null;
}
