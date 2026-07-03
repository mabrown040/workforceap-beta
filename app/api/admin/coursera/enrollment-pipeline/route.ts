import { NextResponse } from 'next/server';

import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { loadCourseraEnrollmentPipeline } from '@/lib/admin/courseraEnrollmentPipeline';

/**
 * GET /api/admin/coursera/enrollment-pipeline
 *
 * Read-only refresh endpoint for the Coursera Enrollment Command Center
 * (`/admin/coursera/enrollment`). Backs the client table's "refresh after
 * approve/enroll" flow without a full page navigation. Shares the exact
 * grouped-query loader the server-rendered page uses on first load — see
 * `lib/admin/courseraEnrollmentPipeline.ts` for the signal derivation.
 */
async function _GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await requireAdmin(user.id);

    const organizationId = await getActorOrganizationId(user.id);
    const data = await loadCourseraEnrollmentPipeline(organizationId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('/api/admin/coursera/enrollment-pipeline error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiGuc(_GET);
