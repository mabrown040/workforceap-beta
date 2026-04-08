import { NextResponse } from 'next/server';
import { getUser, hasSupabaseServerEnv } from '@/lib/auth/server';
import {
  getProfileRole,
  getPartnerForUser,
  getEmployerAccountForNav,
  isSuperAdmin,
} from '@/lib/auth/roles';

export async function GET() {
  try {
    if (!hasSupabaseServerEnv()) {
      return NextResponse.json(
        { role: null, partner: null, employer: null, superAdmin: false, canAccessMemberDashboard: false },
        { status: 200 }
      );
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { role: null, partner: null, employer: null, superAdmin: false, canAccessMemberDashboard: false },
        { status: 200 }
      );
    }

    const [role, partnerCtx, superAdmin, employerNav] = await Promise.all([
      getProfileRole(user.id),
      getPartnerForUser(user.id),
      isSuperAdmin(user.id),
      getEmployerAccountForNav(user.id),
    ]);

    const partnerExclusive = !!partnerCtx && !superAdmin;
    const canAccessMemberDashboard = !partnerExclusive;

    return NextResponse.json({
      role: role || 'member',
      partner: partnerCtx ? { partnerId: partnerCtx.partnerId, name: partnerCtx.partner.name } : null,
      employer: employerNav,
      superAdmin,
      canAccessMemberDashboard,
    });
  } catch (err) {
    console.error('[auth-me] Fatal error in auth/me route:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
