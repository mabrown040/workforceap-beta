import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getSubgroupsForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { getPipelineStage, type PipelineStudent } from '@/lib/pipeline/stage';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let subgroups: { subgroupId: string; subgroup: { id: string; name: string; type: string } }[];
  try {
    subgroups = await getSubgroupsForUser(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden: subgroup leader access required' }, { status: 403 });
  }
  if (subgroups.length === 0) {
    return NextResponse.json({ error: 'Forbidden: no subgroups assigned' }, { status: 403 });
  }

  const subgroupIds = subgroups.map((s) => s.subgroupId);
  const memberSubgroups = await prisma.memberSubgroup.findMany({
    where: { subgroupId: { in: subgroupIds } },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          enrolledProgram: true,
          enrolledAt: true,
          coursesCompleted: true,
          deletedAt: true,
          placementRecord: { select: { employerName: true, jobTitle: true, salaryOffered: true, placedAt: true } },
          userCertifications: { select: { certName: true, earnedAt: true } },
          applications: { select: { status: true, submittedAt: true } },
        },
      },
    },
  });

  const seen = new Set<string>();
  let total = 0;
  let enrolled = 0;
  let completed = 0;
  let placed = 0;

  for (const ms of memberSubgroups) {
    if (ms.member.deletedAt) continue;
    if (seen.has(ms.member.id)) continue;
    seen.add(ms.member.id);

    total++;
    const m = ms.member;
    const program = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram) : null;
    const student: PipelineStudent = {
      id: m.id,
      fullName: m.fullName,
      email: '',
      enrolledProgram: m.enrolledProgram,
      enrolledAt: m.enrolledAt,
      assessmentCompleted: false,
      coursesCompleted: m.coursesCompleted,
      deletedAt: m.deletedAt,
      placementRecord: m.placementRecord,
      userCertifications: m.userCertifications,
      applications: m.applications,
    };
    const stage = getPipelineStage(student);

    if (m.enrolledAt && m.enrolledProgram) enrolled++;
    if (program?.courses.length && (m.coursesCompleted as string[] | null)?.length) {
      const done = (m.coursesCompleted as string[]) ?? [];
      if (program.courses.every((c) => done.includes(c.slug))) completed++;
    }
    if (m.placementRecord) placed++;
  }

  return NextResponse.json({
    subgroups: subgroups.map((s) => s.subgroup),
    stats: {
      total,
      enrolled,
      completed,
      placed,
      active: total - placed,
    },
  });
}
