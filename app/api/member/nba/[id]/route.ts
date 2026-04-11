import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

/** PATCH /api/member/nba/:id — dismiss a DB-sourced next best action */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.memberNextBestAction.update({
      where: { id, memberId: user.id },
      data: { status: 'DISMISSED' },
    });
    return NextResponse.json({ ok: true });
  } catch {
    // Row not found or not owned by this user — silently OK from the client's perspective
    return NextResponse.json({ ok: true });
  }
}
