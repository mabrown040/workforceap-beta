import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { getInboxZeroQueue } from '@/lib/counselor/inboxZero';
import { withApiGuc } from '@/lib/db/withRequestGuc';

export const GET = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const counselor = await isCounselor(user.id);
    const admin = await isAdmin(user.id);
    if (!counselor && !admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const queue = await getInboxZeroQueue(user.id, { isAdmin: admin });
    return NextResponse.json({ queue });
  } catch (err) {
    console.error('[counselor/inbox-zero] GET failed:', err);
    return NextResponse.json({ error: 'Failed to load inbox' }, { status: 500 });
  }
});
