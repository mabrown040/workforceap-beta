import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { createConnectAccount, createAccountLink } from '@/lib/stripe/connect';
import { withTenantScope } from '@/lib/tenant/withTenantScope';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const POST = withApiGuc(async (request: NextRequest) => {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getPartnerForUser(user.id);
    if (!ctx) {
      return NextResponse.json({ error: 'Forbidden: partner access required' }, { status: 403 });
    }

    const partner = await prisma.$transaction((tx) => tx.partner.findUnique({
      where: { id: ctx.partnerId },
      select: { organizationId: true, stripeConnectId: true, contactEmail: true },
    }));
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    let accountId = partner.stripeConnectId;

    if (!accountId) {
      const account = await createConnectAccount(ctx.partnerId, partner.contactEmail || user.email || '');
      accountId = account.id;
      await withTenantScope(partner.organizationId, (db) =>
        db.partner.update({
          where: { id: ctx.partnerId },
          data: { stripeConnectId: accountId, stripeConnectStatus: 'pending' },
        }),
      );
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || 'https://www.workforceap.org';
    const link = await createAccountLink(
      accountId,
      `${origin}/partner?connect=refresh`,
      `${origin}/partner?connect=success`,
    );

    return NextResponse.json({ url: link.url });
  } catch (error) {
    console.error('[partner/connect] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
