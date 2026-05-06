import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { autoHealUnmatchedXapiEvents } from '@/lib/xapi/reprocess';

async function requireAdminUser() {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return null;
  }
  return user;
}

export async function POST() {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await autoHealUnmatchedXapiEvents(100);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Auto-heal failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Use POST to trigger auto-heal' },
    { status: 405 }
  );
}
