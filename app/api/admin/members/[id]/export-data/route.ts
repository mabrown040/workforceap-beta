import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdminOrCounselor } from '@/lib/auth/roles';
import { assertStaffCanAccessMemberRecord } from '@/lib/counselor/staffMemberAccess';
import { buildMemberExport } from '@/lib/member/exportData';

/**
 * GET /api/admin/members/[id]/export-data
 *
 * Admin can export any member's data. Counselor can export only their own
 * assigned members — same scoping as the rest of the counselor surface
 * (lib/counselor/staffMemberAccess.ts). Without this check a counselor
 * could enumerate member ids and exfiltrate GDPR-style dumps for anyone.
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

    // Per-member scope: admin passes through; counselor must be actively
    // assigned to this member.
    const allowed = await assertStaffCanAccessMemberRecord(auth.userId, id);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden: not your assigned member' }, { status: 403 });
    }

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
