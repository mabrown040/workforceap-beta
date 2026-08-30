import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from "@/lib/tenant/organization";
import { sendJobApprovedEmail } from '@/lib/email';
import { runAiMatchForLiveJob } from '@/lib/employer/triggerEmployerJobAiMatch';
import { invalidateJobListings } from '@/lib/jobs/listingCache';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { auditLog } from '@/lib/audit';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 3).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * The `job.findUnique` and `job.updateMany` calls go through `withTenantScope`
 * so an admin from Org A cannot approve an Org B job by guessing its
 * UUID. The findUnique becomes findFirst because the proxy adds
 * `organizationId` to the where clause and the Prisma `findUnique`
 * accepts only the unique constraint.
 */
async function _POST(
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
        include: { employer: { include: { user: { select: { email: true, fullName: true } } } } },
      }),
    );

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (job.status !== 'pending') {
      return NextResponse.json({ error: 'Job is not pending approval' }, { status: 400 });
    }

    const updateResult = await withTenantScope(orgId, (db) =>
      db.job.updateMany({
        where: { id, status: 'pending' },
        data: {
          status: 'live',
          approvedAt: new Date(),
          approvedById: user.id,
        },
      }),
    );
    if (updateResult.count !== 1) {
      return NextResponse.json({ error: 'Job is no longer pending approval' }, { status: 409 });
    }

    let notificationEmailSent = false;
    try {
      const emailResult = await sendJobApprovedEmail({
        to: job.employer.contactEmail,
        jobTitle: job.title,
        companyName: job.employer.companyName,
        orgId,
      });
      notificationEmailSent = emailResult.ok;
    } catch (emailError) {
      console.error('[admin/jobs/approve] approval committed but email failed', emailError);
    }

    after(() => runAiMatchForLiveJob(id));

    let cacheInvalidated = true;
    try {
      await invalidateJobListings();
    } catch (cacheError) {
      cacheInvalidated = false;
      console.error('[admin/jobs/approve] approval committed but cache invalidation failed', cacheError);
    }

    logAuditEvent({
      user: { id: user.id, role: 'admin' },
      verb: 'approve_job',
      object: { type: 'Job', id },
      result: { success: true },
      request: auditRequestMeta(request),
      orgId,
    }).catch((err) => console.error('[audit] approve_job:', err));
    auditLog({ actorUserId: user.id, action: 'admin_job_approved', targetType: 'Job', targetId: id, metadata: { orgId } }).catch(() => {});

    const warnings = [
      notificationEmailSent ? null : 'Employer notification email was not sent.',
      cacheInvalidated ? null : 'Job cache refresh could not be confirmed.',
    ].filter((warning): warning is string => Boolean(warning));

    return NextResponse.json({
      ok: true,
      notificationEmailSent,
      cacheInvalidated,
      warning: warnings.length > 0 ? `Job approved. ${warnings.join(' ')}` : undefined,
    });
  } catch (error) {
    console.error('[admin/jobs/[id]/approve POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
