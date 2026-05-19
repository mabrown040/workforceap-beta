import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { loadPartnerReferralBundle } from '@/lib/partner/referralBundle';

import { withRouteObservability } from '@/lib/api/routeObservability';export const GET = withRouteObservability(async () => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    const ctx = await getPartnerForUser(user.id);
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  
    try {
      const { members } = await loadPartnerReferralBundle(ctx.partnerId, ctx.partner.organizationId);
      return NextResponse.json({
        members: members.map((m) => ({ id: m.id, fullName: m.fullName })),
      });
    } catch (err) {
      console.error('[partner/referral-members] error:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  } catch (error) {
    console.error('/partner/referral-members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
