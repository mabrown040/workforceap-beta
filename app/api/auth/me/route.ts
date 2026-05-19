import { NextResponse } from 'next/server';
import { getUser, hasSupabaseServerEnv } from '@/lib/auth/server';
import {
  getProfileRole,
  getPartnerForUser,
  getEmployerAccountForNav,
  getCounselorForUser,
  isSuperAdmin,
} from '@/lib/auth/roles';
import { getPortalSwitcherRoles } from '@/lib/auth/portalRoleSwitcher';
import { captureApiError } from '@/lib/observability/captureApiError';

import { withRouteObservability } from '@/lib/api/routeObservability';export const GET = withRouteObservability(async () => {
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

    const [role, partnerCtx, counselorCtx, superAdmin, employerNav, availablePortals] = await Promise.all([
      getProfileRole(user.id),
      getPartnerForUser(user.id),
      getCounselorForUser(user.id),
      isSuperAdmin(user.id),
      getEmployerAccountForNav(user.id),
      getPortalSwitcherRoles(user.id),
    ]);

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
});
