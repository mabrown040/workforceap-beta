import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { loadPartnerReferralBundle } from '@/lib/partner/referralBundle';

/** Lightweight list for outreach logging dropdowns. */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { members } = await loadPartnerReferralBundle(ctx.partnerId);
  return NextResponse.json({
    members: members.map((m) => ({ id: m.id, fullName: m.fullName })),
  });
}
