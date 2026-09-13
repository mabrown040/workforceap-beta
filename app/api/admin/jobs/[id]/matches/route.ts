import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { recordWorkflowDiagnostic } from '@/lib/diagnostics';
import { createAdminJobMatchesPrismaDeps } from '@/lib/admin/adminJobMatchesPrismaDeps';
import { runAdminJobMatchesGet } from '@/lib/admin/runAdminJobMatchesGet';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { crossTenantOK, withTenantScope } from '@/lib/tenant/withTenantScope';

const jobSelectForMatch = {
  id: true,
  organizationId: true,
  title: true,
  requirements: true,
  suggestedPrograms: true,
  preferredCertifications: true,
};

export const GET = withApiGuc(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: jobId } = await params;
    const actorOrganizationId = await getActorOrganizationId(user.id);
    const superAdmin = await isSuperAdmin(user.id);

    // Scope the job before constructing any dependency that can read cached
    // candidate PII or run a candidate computation. GUC is context, not proof
    // of application-layer filtering.
    const job = superAdmin
      ? await crossTenantOK(() =>
          prisma.job.findUnique({ where: { id: jobId }, select: jobSelectForMatch }),
        )
      : await withTenantScope(actorOrganizationId, (db) =>
          db.job.findFirst({
            where: { id: jobId, organizationId: actorOrganizationId },
            select: jobSelectForMatch,
          }),
        );
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const result = await runAdminJobMatchesGet(
      jobId,
      job,
      createAdminJobMatchesPrismaDeps(job.organizationId, (input) =>
        recordWorkflowDiagnostic({
          workflow: 'admin_job_matches',
          actorUserId: user.id,
          entityType: 'job',
          entityId: jobId,
          status: input.status,
          summary: input.summary,
          method: input.method,
          fallbackPath: input.fallbackPath ?? null,
          metadata: input.metadata ?? null,
        })
      )
    );

    return NextResponse.json(result.body);
  } catch (error) {
    console.error('[admin/jobs/[id]/matches GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
