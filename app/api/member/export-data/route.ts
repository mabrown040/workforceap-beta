import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { buildMemberExport } from '@/lib/member/exportData';

import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * GET /api/member/export-data
 *
 * Returns a comprehensive JSON export of all personal data for the authenticated member.
 * Used for GDPR data portability / right of access.
 */
async function _GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const exportData = await buildMemberExport(user.id);

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="workforceap-data-export-${user.id}.json"`,
      },
    });
  } catch (error) {
    console.error('/member/export-data error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);
