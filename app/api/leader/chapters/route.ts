import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withTenantScope } from '@/lib/tenant/withTenantScope';

/** List chapters the current user leads (with members, meetings, curriculum) */
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await getActorOrganizationId(user.id);

    const chapters = await withTenantScope(orgId, (db) =>
      db.chapter.findMany({
        where: {
          organizationId: orgId,
          leaderId: user.id,
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  enrolledProgram: true,
                  assessmentCompleted: true,
                  interviewEligible: true,
                  placementRecord: { select: { placedAt: true, employerName: true } },
                },
              },
            },
            orderBy: { joinedAt: 'desc' },
          },
          meetings: { orderBy: { scheduledAt: 'desc' } },
          curriculumItems: {
            include: { course: { select: { id: true, name: true, programSlug: true } } },
            orderBy: { orderIndex: 'asc' },
          },
        },
      }),
    );

    return NextResponse.json(chapters);
  } catch (error) {
    console.error('/leader/chapters GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
