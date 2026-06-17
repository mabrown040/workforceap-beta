import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getSubgroupsForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getPipelineStage, type PipelineStudent } from '@/lib/pipeline/stage';
import { memberProgramCompleted } from '@/lib/partner/memberProgress';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const GET = withApiGuc(async () => {
  try {
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
  const memberSubgroups = await prisma.$transaction((tx) => tx.memberSubgroup.findMany({
    where: { subgroupId: { in: subgroupIds } },
    take: 1000,
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          enrolledProgram: true,
          enrolledAt: true,
          deletedAt: true,
          placementRecord: { select: { employerName: true, jobTitle: true, salaryOffered: true, placedAt: true } },
          userCertifications: { select: { certName: true, earnedAt: true } },
          applications: { select: { status: true, submittedAt: true } },
          memberProgramProgress: {
            select: { programSlug: true, averagePercent: true, coursesCompleted: true },
          },
        },
      },
    },
  }));

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
    const student: PipelineStudent = {
      id: m.id,
      fullName: m.fullName,
      email: '',
      enrolledProgram: m.enrolledProgram,
      enrolledAt: m.enrolledAt,
      assessmentCompleted: false,
      deletedAt: m.deletedAt,
      placementRecord: m.placementRecord,
      userCertifications: m.userCertifications,
      applications: m.applications,
      memberProgramProgress: m.memberProgramProgress,
    };
    const stage = getPipelineStage(student);

    if (m.enrolledAt && m.enrolledProgram) enrolled++;
    if (memberProgramCompleted(m.enrolledProgram, null, m.memberProgramProgress)) completed++;
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

  } catch (error) {
    console.error('/subgroup/dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

