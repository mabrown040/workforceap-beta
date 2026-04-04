import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const noteSchema = z.object({
  content: z.string().min(1).max(5000),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isCounselor(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await params;
  const notes = await prisma.counselorNote.findMany({
    where: { memberId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { author: { select: { fullName: true, email: true } } },
  });
  return NextResponse.json(notes);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isCounselor(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Note content required' }, { status: 400 });

  const member = await prisma.user.findUnique({ where: { id: memberId }, select: { id: true } });
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const note = await prisma.counselorNote.create({
    data: { memberId, authorId: user.id, content: parsed.data.content },
    include: { author: { select: { fullName: true, email: true } } },
  });
  return NextResponse.json(note, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isCounselor(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await params;
  const { noteId } = await request.json().catch(() => ({}));
  if (!noteId) return NextResponse.json({ error: 'noteId required' }, { status: 400 });

  const note = await prisma.counselorNote.findFirst({
    where: { id: noteId, memberId, authorId: user.id },
  });
  if (!note) return NextResponse.json({ error: 'Note not found or not yours' }, { status: 404 });

  await prisma.counselorNote.delete({ where: { id: noteId } });
  return NextResponse.json({ ok: true });
}
