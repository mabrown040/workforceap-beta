import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import {
  getProfileRole,
  getPartnerForUser,
  getEmployerAccountForNav,
  isSuperAdmin,
} from '@/lib/auth/roles';

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { role: null, partner: null, employer: null, superAdmin: false },
      { status: 200 }
    );
  }

  const [role, partnerCtx, superAdmin, employerNav] = await Promise.all([
    getProfileRole(user.id),
    getPartnerForUser(user.id),
    isSuperAdmin(user.id),
    getEmployerAccountForNav(user.id),
  ]);
  return NextResponse.json({
    role: role || 'member',
    partner: partnerCtx ? { partnerId: partnerCtx.partnerId, name: partnerCtx.partner.name } : null,
    employer: employerNav,
    superAdmin,
  });
}
