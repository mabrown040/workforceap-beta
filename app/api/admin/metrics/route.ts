import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getAdminMetrics } from '@/lib/admin/metrics';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const metrics = await getAdminMetrics();
  return NextResponse.json(metrics);
}
