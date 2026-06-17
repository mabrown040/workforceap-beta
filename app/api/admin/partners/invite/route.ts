import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { brandedEmailLayout } from '@/lib/email/template';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';

async function _POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      await requireAdmin(user.id);
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, name } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const resendKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || 'noreply@workforceap.org';
    if (!resendKey) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
    }

    const bodyHtml = `
      <p>Hi ${name || 'Partner'},</p>
      <p>You've been invited to access the WorkforceAP Partner Portal. The portal gives you visibility into the progress of members you've referred — including program enrollment, course completion, certifications, and job placement.</p>
      <p>To get started, create your account or sign in at the link below.</p>
      <p style="color: #666;">If you have questions, reply to this email or contact us at info@workforceap.org.</p>
      <p style="color: #666;">— WorkforceAP Team</p>
    `;

    const html = brandedEmailLayout({
      title: 'Partner Portal Access',
      bodyHtml,
      ctaText: 'Access Partner Portal',
      ctaUrl: `${SITE_URL}/partner`,
    });

    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: emailFrom,
        to: email,
        subject: '[WorkforceAP] Partner Portal Access Invitation',
        html,
      });
      void auditLog({ actorUserId: user.id, action: 'admin_partner_invite_send', targetType: 'user', targetId: user.id, metadata: { email } }).catch(() => {});
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error('Partner invite email failed:', err);
      return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
    }
  } catch (error) {
    console.error('/admin/partners/invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
