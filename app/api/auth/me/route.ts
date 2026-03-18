import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getProfileRole } from '@/lib/auth/roles';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ role: null }, { status: 200 });

  const role = await getProfileRole(user.id);
  return NextResponse.json({ role: role || 'member' });
}
