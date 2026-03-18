import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await requireAdmin(user.id);

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const programSlug = typeof o.programSlug === 'string' ? o.programSlug.trim() : '';

  if (!programSlug) {
    return NextResponse.json({ error: 'programSlug required' }, { status: 400 });
  }

  const program = getProgramBySlug(programSlug);
  if (!program) {
    return NextResponse.json({ error: 'Invalid program' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id },
    data: {
      enrolledProgram: programSlug,
      programChangedAt: new Date(),
      coursesCompleted: [],
    },
  });

  return NextResponse.json({ ok: true });
}
