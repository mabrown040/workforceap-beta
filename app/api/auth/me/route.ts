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

export const GET = withApiGuc(async () => {
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

    const role = await getProfileRole(user.id);
    const superAdmin = role === 'super_admin';

    if (superAdmin) {
      const availablePortals = await getPortalSwitcherRoles(user.id, {
        superAdmin: true,
        userRoleNames: ['super_admin'],
        hasEmployer: false,
        hasPartner: false,
        hasCounselor: false,
        hasAdmin: true,
      });

      return NextResponse.json(
        {
          role,
          partner: null,
          employer: null,
          counselor: null,
          superAdmin: true,
          canAccessMemberDashboard: false,
          availablePortals,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Fetch each primitive once, then hand them to getPortalSwitcherRoles as
    // precomputed inputs. Previously the switcher re-fetched partner / counselor
    // / employer / roles / super-admin internally, doubling DB work on this
    // frequently polled endpoint and amplifying connection-pool pressure
    // (Sentry JAVASCRIPT-NEXTJS-T: "Unable to start a transaction in the given time").
    const [partnerCtx, counselorCtx, employerNav, userRoleNames, adminAccess] =
      await Promise.all([
        getPartnerForUser(user.id),
        getCounselorForUser(user.id),
        getEmployerAccountForNav(user.id),
        getUserRoles(user.id),
        isAdmin(user.id),
      ]);

    const availablePortals = await getPortalSwitcherRoles(user.id, {
      superAdmin: false,
      userRoleNames,
      hasEmployer: !!employerNav,
      hasPartner: !!partnerCtx,
      hasCounselor: !!counselorCtx,
      hasAdmin: adminAccess,
    });

    const partnerExclusive = !!partnerCtx;
    const canAccessMemberDashboard = !partnerExclusive;

    return NextResponse.json(
      {
        role: role || 'member',
        partner: partnerCtx ? { partnerId: partnerCtx.partnerId, name: partnerCtx.partner.name } : null,
        employer: employerNav,
        counselor: counselorCtx ? { counselorId: counselorCtx.counselorId, partnerId: counselorCtx.partnerId } : null,
        superAdmin: false,
        canAccessMemberDashboard,
        availablePortals,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    captureApiError(err, { route: 'auth/me' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
