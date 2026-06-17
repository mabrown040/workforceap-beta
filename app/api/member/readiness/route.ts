import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getMemberReadinessSections } from '@/lib/readiness/memberReadinessSections';

import { withApiGuc } from '@/lib/db/withRequestGuc';

async function _GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    try {
      const sections = await getMemberReadinessSections(user.id);
      return NextResponse.json({ sections });
    } catch (e) {
      console.error('[api/member/readiness]', e);
      return NextResponse.json(
        { error: 'Failed to load readiness checklist', sections: [] as [] },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('/member/readiness:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);
