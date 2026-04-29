import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { awardPoints } from '@/lib/member/points';

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [admin, counselor] = await Promise.all([isAdmin(user.id), isCounselor(user.id)]);
  if (!admin && !counselor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: memberId } = await params;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const points = typeof o.points === 'number' ? Math.round(o.points) : 0;
  const note = typeof o.note === 'string' ? o.note.trim().slice(0, 500) : '';

  if (points < 1 || points > 1000) {
    return NextResponse.json({ error: 'Points must be between 1 and 1000' }, { status: 400 });
  }

  const entityId = `bonus-${Date.now()}`;
  const result = await awardPoints(memberId, 'counselor_bonus', entityId, points, {
    note: note || undefined,
    awardedBy: user.id,
  });

  return NextResponse.json({ ok: true, ...result });
}
