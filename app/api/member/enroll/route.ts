import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const slug = typeof o.programSlug === 'string' ? o.programSlug.trim() : '';

  if (!slug) {
    return NextResponse.json({ error: 'programSlug is required' }, { status: 400 });
  }

  const program = getProgramBySlug(slug);
  if (!program) {
    return NextResponse.json({ error: 'Invalid program' }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enrolledProgram: true },
  });

  if (dbUser?.enrolledProgram) {
    return NextResponse.json({ error: 'Already enrolled in a program. Changes require admin.' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      enrolledProgram: slug,
      enrolledAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, programSlug: slug });
}
