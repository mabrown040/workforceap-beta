import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withTenantScope } from '@/lib/tenant/withTenantScope';

/** Get chapter details for leader (including members, meetings, curriculum) */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const orgId = await getActorOrganizationId(user.id);

    const chapter = await withTenantScope(orgId, (db) =>
      db.chapter.findFirst({
        where: {
          id,
          organizationId: orgId,
          leaderId: user.id, // leader can only view their own chapter
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

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found or not authorized' }, { status: 404 });
    }

    return NextResponse.json(chapter);
  } catch (error) {
    console.error('/leader/chapters/[id] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
