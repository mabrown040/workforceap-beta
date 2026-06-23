import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { renderTemplate, getDefaultSampleData } from '@/lib/admin/emailTemplate';
import { Resend } from 'resend';
import { sanitizeEmailSubjectLine } from '@/lib/email/escapeHtml';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getFrom(): string {
  return process.env.EMAIL_FROM || 'WorkforceAP <hello@workforceap.org>';
}

export const POST = withApiGuc(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try { await requireAdmin(user.id); } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const template = await prisma.$transaction((tx) => tx.emailTemplate.findUnique({ where: { id } }));
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let body: { to?: string; variables?: Record<string, string> } = {};
    try { body = await req.json(); } catch { /* no body is fine */ }

    const to = body.to?.trim() || user.email;
    if (!to) {
      return NextResponse.json({ error: 'No recipient email available' }, { status: 400 });
    }

    const sampleData = body.variables ?? getDefaultSampleData(template.variables);
    const rendered = renderTemplate(template, sampleData);

    const resend = getResend();
    if (!resend) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
    }

    try {
      await resend.emails.send({
        from: getFrom(),
        to,
        subject: sanitizeEmailSubjectLine(rendered.subject),
        html: rendered.html,
      });
    } catch (err) {
      console.error('Test email send failed:', err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Send failed' },
        { status: 502 }
      );
    }

    void auditLog({ actorUserId: user.id, action: 'admin_email_template_test_sent', targetType: 'User', targetId: user.id, metadata: { templateId: id, sentTo: to } }).catch(() => {});
    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'EmailTemplateTest', id }, result: { success: true, extensions: { sentTo: to } } }).catch(() => {});
    return NextResponse.json({ ok: true, sentTo: to, subject: rendered.subject });
  } catch (error) {
    console.error('/admin/email-templates/[id]/test error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
