import { NextResponse } from 'next/server';
import { getUser, hasSupabaseServerEnv } from '@/lib/auth/server';
import {
  getProfileRole,
  getPartnerForUser,
  getEmployerAccountForNav,
  getCounselorForUser,
  getUserRoles,
  isAdmin,
  isSuperAdmin,
} from '@/lib/auth/roles';
import { getPortalSwitcherRoles } from '@/lib/auth/portalRoleSwitcher';
import { captureApiError } from '@/lib/observability/captureApiError';
import { withApiGuc } from '@/lib/db/withRequestGuc';

async function _GET() {
  try {
    if (!hasSupabaseServerEnv()) {
      return NextResponse.json(
        {
          role: null,
          partner: null,
          employer: null,
          counselor: null,
          superAdmin: false,
          canAccessMemberDashboard: false,
          availablePortals: [],
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        {
          role: null,
          partner: null,
          employer: null,
          counselor: null,
          superAdmin: false,
          canAccessMemberDashboard: false,
          availablePortals: [],
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Fetch each primitive once, then hand them to getPortalSwitcherRoles as
    // precomputed inputs. Previously the switcher re-fetched partner / counselor
    // / employer / roles / super-admin internally, doubling DB work on this
    // frequently polled endpoint and amplifying connection-pool pressure
    // (Sentry JAVASCRIPT-NEXTJS-T: "Unable to start a transaction in the given time").
    const [role, partnerCtx, counselorCtx, superAdmin, employerNav, userRoleNames, adminAccess] =
      await Promise.all([
        getProfileRole(user.id),
        getPartnerForUser(user.id),
        getCounselorForUser(user.id),
        isSuperAdmin(user.id),
        getEmployerAccountForNav(user.id),
        getUserRoles(user.id),
        isAdmin(user.id),
      ]);

    const availablePortals = await getPortalSwitcherRoles(user.id, {
      superAdmin,
      userRoleNames,
      hasEmployer: !!employerNav,
      hasPartner: !!partnerCtx,
      hasCounselor: !!counselorCtx,
      hasAdmin: adminAccess,
    });

    const partnerExclusive = !!partnerCtx && !superAdmin;
    const canAccessMemberDashboard = !partnerExclusive;

    return NextResponse.json(
      {
        role: role || 'member',
        partner: partnerCtx ? { partnerId: partnerCtx.partnerId, name: partnerCtx.partner.name } : null,
        employer: employerNav,
        counselor: counselorCtx ? { counselorId: counselorCtx.counselorId, partnerId: counselorCtx.partnerId } : null,
        superAdmin,
        canAccessMemberDashboard,
        availablePortals,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    captureApiError(err, { route: 'auth/me' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);
