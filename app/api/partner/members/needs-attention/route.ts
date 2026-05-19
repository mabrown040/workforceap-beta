import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { buildPartnerAttentionQueue } from '@/lib/partner/attentionQueue';

import { withRouteObservability } from '@/lib/api/routeObservability';export const GET = withRouteObservability(async () => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const members = await buildPartnerAttentionQueue(ctx.partnerId);
  return NextResponse.json({ members });

  } catch (error) {
    console.error('/partner/members/needs-attention error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

