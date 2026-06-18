import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { recordWorkflowDiagnostic } from '@/lib/diagnostics';
import { createAdminJobMatchesPrismaDeps } from '@/lib/admin/adminJobMatchesPrismaDeps';
import { runAdminJobMatchesGet } from '@/lib/admin/runAdminJobMatchesGet';
import { withApiGuc } from '@/lib/db/withRequestGuc';

export const GET = withApiGuc(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: jobId } = await params;

    const result = await runAdminJobMatchesGet(
      jobId,
      createAdminJobMatchesPrismaDeps((input) =>
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

    if ('notFound' in result && result.notFound) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    const ok = result as { status: 200; body: unknown };
    return NextResponse.json(ok.body);
  } catch (error) {
    console.error('[admin/jobs/[id]/matches GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
