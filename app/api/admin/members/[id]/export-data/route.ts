import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdminOrCounselor } from '@/lib/auth/roles';
import { buildMemberExport } from '@/lib/member/exportData';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { withRouteObservability } from '@/lib/api/routeObservability';export const GET = withRouteObservability(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const auth = await requireAdminOrCounselor(_req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    // Verify the member belongs to the actor's org before building
    // the export. buildMemberExport() does not enforce org scoping.
    const actor = await getUser();
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = await getActorOrganizationId(actor.id);
    const member = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const exportData = await buildMemberExport(id);

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="workforceap-data-export-${id}.json"`,
      },
    });
  } catch (error) {
    console.error('/admin/members/[id]/export-data error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'User not found') {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
