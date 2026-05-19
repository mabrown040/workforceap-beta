import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from "@/lib/tenant/organization";
import { sendJobApprovedEmail } from '@/lib/email';
import { runAiMatchForLiveJob } from '@/lib/employer/triggerEmployerJobAiMatch';
import { invalidateJobListings } from '@/app/api/(portal)/dashboard/jobs/route';

import { withRouteObservability } from '@/lib/api/routeObservability';export const POST = withRouteObservability(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
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

    await withTenantScope(orgId, (db) =>
      db.job.update({
        where: { id },
        data: {
          status: 'live',
          approvedAt: new Date(),
          approvedById: user.id,
        },
      }),
    );

    await sendJobApprovedEmail({
      to: job.employer.contactEmail,
      jobTitle: job.title,
      companyName: job.employer.companyName,
      orgId,
    });

    after(() => runAiMatchForLiveJob(id));

    await invalidateJobListings();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/jobs/[id]/approve POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
