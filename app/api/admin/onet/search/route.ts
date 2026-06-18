import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { searchOccupations } from '@/lib/onet/client';
import { withApiGuc } from '@/lib/db/withRequestGuc';

async function _GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      await requireAdmin(user.id);
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  
    const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
    if (q.length < 2) {
      return NextResponse.json({ occupations: [] });
    }
  
    try {
      const occupations = await searchOccupations(q);
      return NextResponse.json({ occupations });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('/admin/onet/search O*NET error:', msg);
      return NextResponse.json({ error: `O*NET search unavailable: ${msg}`, occupations: [] }, { status: 503 });
    }
  } catch (error) {
    console.error('/admin/onet/search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiGuc(_GET);
