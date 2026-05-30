import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from "@/lib/tenant/organization";
import { sendJobRejectedEmail } from '@/lib/email';
import { invalidateJobListings } from '@/lib/jobs/listingCache';
import { z } from 'zod';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 3).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * The `job.findUnique` + `job.update` calls go through `withTenantScope`
 * so an admin from Org A cannot reject an Org B job. `findUnique`
 * becomes `findFirst` because the proxy must inject `organizationId`
 * into the where clause.
 */
const rejectSchema = z.object({
  reason: z.string().min(1).max(1000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const orgId = await getActorOrganizationId(user.id);

    const job = await withTenantScope(orgId, (db) =>
      db.job.findFirst({
        where: { id },
        include: { employer: { select: { contactEmail: true, companyName: true } } },
      }),
    );

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (job.status !== 'pending') {
      return NextResponse.json({ error: 'Job is not pending' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = rejectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    await withTenantScope(orgId, (db) =>
      db.job.update({
        where: { id },
        data: { status: 'closed' },
      }),
    );

    await sendJobRejectedEmail({
      to: job.employer.contactEmail,
      jobTitle: job.title,
      companyName: job.employer.companyName,
      reason: parsed.data.reason,
      orgId,
    });

    await invalidateJobListings();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/jobs/[id]/reject POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
