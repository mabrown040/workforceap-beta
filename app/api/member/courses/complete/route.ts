import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { sendPartnerMilestoneEmail } from '@/lib/notifications/partner-notify';

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
  const courseSlug = typeof o.courseSlug === 'string' ? o.courseSlug.trim() : '';

  if (!courseSlug) {
    return NextResponse.json({ error: 'courseSlug is required' }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enrolledProgram: true, coursesCompleted: true },
  });

  if (!dbUser?.enrolledProgram) {
    return NextResponse.json({ error: 'No program enrolled' }, { status: 400 });
  }

  const program = getProgramBySlug(dbUser.enrolledProgram);
  if (!program) {
    return NextResponse.json({ error: 'Invalid program' }, { status: 400 });
  }

  const courseExists = program.courses.some((c) => c.slug === courseSlug);
  if (!courseExists) {
    return NextResponse.json({ error: 'Course not in your program' }, { status: 400 });
  }

  const completed = (dbUser.coursesCompleted as string[] | null) ?? [];
  if (completed.includes(courseSlug)) {
    return NextResponse.json({ ok: true });
  }

  const updated = [...completed, courseSlug];

  await prisma.user.update({
    where: { id: user.id },
    data: { coursesCompleted: updated },
  });

  const courseMeta = program.courses.find((c) => c.slug === courseSlug);
  await sendPartnerMilestoneEmail(user.id, 'Course completed', {
    Course: courseMeta?.name ?? courseSlug,
  });

  return NextResponse.json({ ok: true });
}
