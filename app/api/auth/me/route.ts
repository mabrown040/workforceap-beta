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

export async function GET() {
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
        { status: 200 }
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
        { status: 200 }
      );
    }

    const [role, superAdmin, entityPrefetch] = await Promise.all([
      getProfileRole(user.id),
      isSuperAdmin(user.id),
      Promise.all([
        getPartnerForUser(user.id),
        getCounselorForUser(user.id),
        getEmployerAccountForNav(user.id),
      ]),
    ]);
    const [partnerCtx, counselorCtx, employerNav] = entityPrefetch;
    const availablePortals = await getPortalSwitcherRoles(user.id, {
      partnerCtx,
      counselorCtx,
      employerNav,
    });

    const partnerExclusive = !!partnerCtx && !superAdmin;
    const canAccessMemberDashboard = !partnerExclusive;

    return NextResponse.json({
      role: role || 'member',
      partner: partnerCtx ? { partnerId: partnerCtx.partnerId, name: partnerCtx.partner.name } : null,
      employer: employerNav,
      counselor: counselorCtx ? { counselorId: counselorCtx.counselorId, partnerId: counselorCtx.partnerId } : null,
      superAdmin,
      canAccessMemberDashboard,
      availablePortals,
    });
  } catch (err) {
    console.error('[auth-me] Fatal error in auth/me route:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
