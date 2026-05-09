import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { MEMBER_OR_DOGFOOD_WHERE } from '@/lib/admin/memberOnlyWhere';

export type TrainingProgressAggregateRow = {
  userId: string;
  fullName: string;
  email: string;
  programSlug: string;
  programTitle: string;
  coursesCompleted: number;
  coursesInProgress: number;
  totalCourses: number;
  averagePercent: number;
  lastActivityAt: string | null;
};

export type TrainingProgressAggregateResponse = {
  rows: TrainingProgressAggregateRow[];
  summary: {
    totalMembers: number;
    activeThisWeek: number;
    avgPercent: number;
  };
};

export async function GET() {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const members = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...MEMBER_OR_DOGFOOD_WHERE,
      enrolledProgram: { not: null },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      enrolledProgram: true,
      courseProgress: {
        select: {
          programSlug: true,
          courseSlug: true,
          status: true,
          percentComplete: true,
          lastActivityAt: true,
          lastUpdatedAt: true,
        },
      },
      memberProgramProgress: {
        select: {
          programSlug: true,
          averagePercent: true,
          coursesCompleted: true,
        },
      },
    },
  });

  const rows: TrainingProgressAggregateRow[] = [];
  let activeThisWeek = 0;
  let totalPercent = 0;

  for (const m of members) {
    if (!m.enrolledProgram) continue;

    const programSlug = m.enrolledProgram;
    const courses = m.courseProgress.filter((c) => c.programSlug === programSlug);
    const completed = courses.filter((c) => c.status === 'COMPLETED').length;
    const inProgress = courses.filter((c) => c.status === 'IN_PROGRESS').length;
    const rollup = m.memberProgramProgress.find((r) => r.programSlug === programSlug);
    const avgPercent = rollup?.averagePercent ?? 0;

    const lastActivityAt = courses
      .map((c) => c.lastActivityAt ?? c.lastUpdatedAt)
      .filter(Boolean)
      .sort((a, b) => (b!.getTime() - a!.getTime()))[0] ?? null;

    if (lastActivityAt && lastActivityAt >= sevenDaysAgo) {
      activeThisWeek += 1;
    }

    totalPercent += avgPercent;

    rows.push({
      userId: m.id,
      fullName: m.fullName ?? m.email,
      email: m.email,
      programSlug,
      programTitle: programSlug, // client can resolve via getProgramBySlug if needed
      coursesCompleted: completed,
      coursesInProgress: inProgress,
      totalCourses: courses.length,
      averagePercent: avgPercent,
      lastActivityAt: lastActivityAt?.toISOString() ?? null,
    });
  }

  return NextResponse.json({
    rows,
    summary: {
      totalMembers: rows.length,
      activeThisWeek,
      avgPercent: rows.length > 0 ? Math.round(totalPercent / rows.length) : 0,
    },
  });
}
