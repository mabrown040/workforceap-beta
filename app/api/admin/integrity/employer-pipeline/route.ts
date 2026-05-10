import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdminInOrg } from '@/lib/auth/roles';
import { resolveOrgFromRequest } from '@/lib/tenant/resolveOrgFromRequest';
import { verifyPipelineIntegrity } from '@/lib/employer/jobPipeline';

/**
 * GET /api/admin/integrity/employer-pipeline
 *
 * Returns the current integrity state of the employer job pipeline.
 * Requires admin auth in the resolved org.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = await resolveOrgFromRequest(request.headers);
    if (!(await isAdminInOrg(user.id, orgId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await verifyPipelineIntegrity();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[admin/integrity/employer-pipeline GET] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
