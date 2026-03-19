import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const noteSchema = z.object({
  content: z.string().min(1).max(5000),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const notes = await prisma.counselorNote.findMany({
    where: { memberId: id },
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { fullName: true, email: true } } },
  });
  return NextResponse.json(notes);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Note content required' }, { status: 400 });

  const member = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const note = await prisma.counselorNote.create({
    data: { memberId: id, authorId: user.id, content: parsed.data.content },
    include: { author: { select: { fullName: true, email: true } } },
  });
  return NextResponse.json(note, { status: 201 });
}