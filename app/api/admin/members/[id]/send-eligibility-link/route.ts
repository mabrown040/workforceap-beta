import { NextResponse } from 'next/server';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { getSubjectOrganizationId, getActorOrganizationId } from '@/lib/tenant/organization';
import { sendEligibilityLink } from '@/lib/email';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';

/**
 * POST /api/admin/members/[id]/send-eligibility-link
 *
 * Admin-only. Emails an existing member a link to the login-gated eligibility
 * questionnaire portal page (/dashboard/eligibility), where they can complete
 * or update their WIOA eligibility info. No token. Reuses isAdmin + withApiGuc.
 */
export const POST = withApiGuc(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
    try {
      const user = await getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (!(await isAdmin(user.id))) {
        return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
      }

      const { id } = await context.params;
      const superAdmin = await isSuperAdmin(user.id);
      const actorOrgId = superAdmin ? null : await getActorOrganizationId(user.id).catch(() => null);
      const member = await prisma.$transaction((tx) => tx.user.findUnique({
        where: { id, ...(actorOrgId ? { organizationId: actorOrgId } : {}) },
        select: { email: true, fullName: true },
      }));
      if (!member?.email) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      const orgId = await getSubjectOrganizationId(id).catch(() => null);
      const url = `${SITE_URL}/dashboard/eligibility`;

      const result = await sendEligibilityLink({
        to: member.email,
        name: member.fullName,
        url,
        orgId,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error ?? 'Could not send email' }, { status: 502 });
      }

      auditLog({ actorUserId: user.id, action: 'admin_send_eligibility_link', targetType: 'User', targetId: id }).catch(() => {});
      logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'sent', object: { type: 'EligibilityLink', id }, result: { success: true } }).catch(() => {});
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error('/admin/members/[id]/send-eligibility-link error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);
