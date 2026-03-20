import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getProfileRole, getPartnerForUser } from '@/lib/auth/roles';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ role: null, partner: null }, { status: 200 });

  const [role, partnerCtx] = await Promise.all([getProfileRole(user.id), getPartnerForUser(user.id)]);
  return NextResponse.json({
    role: role || 'member',
    partner: partnerCtx ? { partnerId: partnerCtx.partnerId, name: partnerCtx.partner.name } : null,
  });
}
