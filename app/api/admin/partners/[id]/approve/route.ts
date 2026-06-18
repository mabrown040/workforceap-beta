import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { Resend } from 'resend';
import { sanitizeEmailSubjectLine } from '@/lib/email/escapeHtml';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { getProfileRole } from '@/lib/auth/roles';

export const POST = withApiGuc(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    // Partner IS in TENANT_SCOPED_MODELS — wrap reads + writes so an
    // Org A admin cannot approve an Org B partner by guessing its UUID.
    const orgId = await getActorOrganizationId(user.id);

    const partner = await withTenantScope(orgId, (db) =>
      db.partner.findFirst({
        where: { id },
        select: {
          id: true,
          status: true,
          contactEmail: true,
          contactName: true,
          name: true,
          slug: true,
          referralCode: true,
        },
      }),
    );

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    if (partner.status !== 'pending_approval') {
      return NextResponse.json({ error: 'Partner is not pending approval' }, { status: 400 });
    }

    await withTenantScope(orgId, (db) =>
      db.partner.update({
        where: { id },
        data: {
          status: 'active',
          active: true,
          approvedAt: new Date(),
          approvedById: user.id,
        },
      }),
    );

    const profileRole = await getProfileRole(user.id);
    auditLog({ actorUserId: user.id, action: 'admin_partner_approve', targetType: 'Partner', targetId: id, metadata: { orgId } }).catch((err) => console.error('[audit] admin_partner_approve:', err));
    await logAuditEvent({
      user: { id: user.id, role: profileRole ?? undefined },
      verb: 'approved',
      object: { type: 'Partner', id },
      result: { success: true },
      request: auditRequestMeta(request),
      orgId,
    }).catch((err) => console.error('[audit] partner approve:', err));

    // Send approval email
    const resendKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || 'noreply@workforceap.org';
    if (resendKey && partner.contactEmail) {
      try {
        const resend = new Resend(resendKey);
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';
        const refParam = partner.referralCode ?? partner.slug;
        const referralApplyUrl = `${siteUrl}/apply?ref=${encodeURIComponent(refParam)}`;

        await resend.emails.send({
          from: emailFrom,
          to: partner.contactEmail,
          subject: sanitizeEmailSubjectLine('Your WorkforceAP partner account has been approved'),
          text: [
            `Hi ${partner.contactName || 'there'},`,
            '',
            `Great news — ${partner.name} has been approved as a WorkforceAP referral partner!`,
            '',
            'You can now start referring members using your unique referral link:',
            referralApplyUrl,
            '',
            'Log in to your partner portal to track referrals, view member progress, and manage payouts.',
            '',
            `Portal: ${siteUrl}/partner`,
            '',
            'Questions? Reply to this email or contact us at info@workforceap.org.',
            '',
            '— WorkforceAP Team',
          ].join('\n'),
        });
      } catch (e) {
        console.error('Partner approval email failed:', e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('/admin/partners/[id]/approve:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
