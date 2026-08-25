import { after, NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { sendEmployerApprovedEmail } from '@/lib/email';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { notifyDiscord } from '@/lib/notify/discord';

import { withApiGuc } from '@/lib/db/withRequestGuc';

export const POST = withApiGuc(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      await requireAdmin(user.id);
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: employerId } = await params;
    // Use the actor's organization, not the global default — otherwise a
    // non-default-org admin can't approve their own tenant's employers
    // (AUDIT §C-T7).
    const orgId = await getActorOrganizationId(user.id);

    let body: { notes?: string } = {};
    try {
      body = await request.json();
    } catch {
      // notes are optional
    }

    const employer = await withTenantScope(orgId, (db) =>
      db.employer.findFirst({
        where: { id: employerId },
        select: {
          id: true, status: true, contactEmail: true, companyName: true, contactName: true, userId: true,
        },
      }),
    );

    if (!employer) {
      return NextResponse.json({ error: 'Employer not found' }, { status: 404 });
    }

    if (employer.status === 'active') {
      return NextResponse.json({ error: 'Employer is already active' }, { status: 400 });
    }

    const updated = await withTenantScope(orgId, (db) =>
      db.employer.update({
        where: { id: employerId },
        data: {
          status: 'active',
          approvedAt: new Date(),
          approvedById: user.id,
          approvalNotes: body.notes || null,
        },
        select: { id: true, status: true, companyName: true, contactEmail: true, contactName: true },
      }),
    );

    // Best-effort approval email via `after()` so Vercel does not freeze early.
    if (updated.contactEmail) {
      after(() =>
        sendEmployerApprovedEmail({
          to: updated.contactEmail!,
          companyName: updated.companyName,
          contactName: updated.contactName || 'there',
        }).catch((err) => console.error('Employer approval email failed:', err))
      );
    }

    await auditLog({
      actorUserId: user.id,
      action: 'employer_approve',
      targetType: 'employer',
      targetId: employerId,
      metadata: { orgId, previousStatus: employer.status },
    });
    const actorRole = (await isSuperAdmin(user.id)) ? 'super_admin' : 'admin';
    await logAuditEvent({
      user: { id: user.id, role: actorRole },
      verb: 'approved',
      object: { type: 'Employer', id: employerId },
      result: { success: true, extensions: { previousStatus: employer.status, orgId } },
      request: auditRequestMeta(request),
      orgId,
    }).catch((err) => console.error('[audit] employer approve:', err));

    // Operator visibility bridge — employer approval is high-signal
    void notifyDiscord({
      title: `Employer approved: ${updated.companyName}`,
      body: `Approved by ${actorRole} ${user.id.slice(0, 8)}…`,
      category: 'employer_approval',
      level: 'success',
      fields: [
        { name: 'company', value: updated.companyName ?? '—' },
        { name: 'email', value: updated.contactEmail ?? '—' },
        { name: 'previousStatus', value: employer.status },
        { name: 'approvedBy', value: actorRole },
      ],
    });

    return NextResponse.json({ success: true, employer: updated });
  } catch (err) {
    console.error('Approve employer error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
