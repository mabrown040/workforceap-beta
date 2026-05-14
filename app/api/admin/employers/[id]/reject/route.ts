import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { sendEmployerRejectedEmail } from '@/lib/email';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      await requireAdmin(user.id);
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: employerId } = await params;
    const orgId = await getDefaultOrganizationId();

    let body: { reason?: string } = {};
    try {
      body = await request.json();
    } catch {
      // reason is optional
    }

    const employer = await withTenantScope(orgId, (db) =>
      db.employer.findFirst({
        where: { id: employerId },
        select: {
          id: true, status: true, contactEmail: true, companyName: true, contactName: true,
        },
      }),
    );

    if (!employer) {
      return NextResponse.json({ error: 'Employer not found' }, { status: 404 });
    }

    if (employer.status === 'inactive') {
      return NextResponse.json({ error: 'Employer is already rejected' }, { status: 400 });
    }

    const updated = await withTenantScope(orgId, (db) =>
      db.employer.update({
        where: { id: employerId },
        data: {
          status: 'inactive',
          approvedAt: null,
          approvedById: user.id,
          approvalNotes: body.reason || null,
        },
        select: { id: true, status: true, companyName: true, contactEmail: true, contactName: true },
      }),
    );

    // Best-effort rejection email
    if (employer.contactEmail) {
      sendEmployerRejectedEmail({
        to: employer.contactEmail,
        companyName: employer.companyName,
        contactName: employer.contactName || 'there',
        reason: body.reason,
      }).catch((err) => console.error('Employer rejection email failed:', err));
    }

    return NextResponse.json({ success: true, employer: updated });
  } catch (err) {
    console.error('Reject employer error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
