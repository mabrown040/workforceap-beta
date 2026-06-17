import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { autoHealUnmatchedXapiEvents } from '@/lib/xapi/reprocess';
import { withApiGuc } from '@/lib/db/withRequestGuc';

async function requireAdminUser() {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return null;
  }
  return user;
}

async function _POST() {
  try {
    const user = await requireAdminUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    try {
      const result = await autoHealUnmatchedXapiEvents(200);
      // Surface a flat number the admin UI can show in the success toast.
      // `result.processed` already includes both pathways (existing
      // `coursera_xapi_events` rows + drained `xapi_statements.processed=false`
      // rows from the pending replay), so a single number is accurate.
      return NextResponse.json({ ok: true, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Auto-heal failed';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    console.error('/admin/coursera/auto-heal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiGuc(_POST);

export async function GET() {
  try {
    return NextResponse.json(
      { error: 'Use POST to trigger auto-heal' },
      { status: 405 }
    );
  } catch (error) {
    console.error('/admin/coursera/auto-heal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
