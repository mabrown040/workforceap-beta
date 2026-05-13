import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdminOrCounselor } from '@/lib/auth/roles';
import { buildMemberExport } from '@/lib/member/exportData';

/**
 * GET /api/admin/members/[id]/export-data
 *
 * Admin/counselor can export any member's data.
 * Returns the same comprehensive JSON structure as the member self-export.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminOrCounselor(_req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

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
}
