import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getSubgroupsForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { memberProgramProgressPct } from '@/lib/partner/memberProgress';
import { getPipelineStage, PIPELINE_STAGE_LABELS, type PipelineStudent } from '@/lib/pipeline/stage';

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
          email: true,
          enrolledProgram: true,
          enrolledAt: true,
          coursesCompleted: true,
          updatedAt: true,
          deletedAt: true,
          assessmentCompleted: true,
          placementRecord: {
            select: { employerName: true, jobTitle: true, salaryOffered: true, placedAt: true },
          },
          userCertifications: { select: { certName: true, earnedAt: true } },
          applications: { select: { status: true, submittedAt: true } },
        },
      },
    },
  });

  const seen = new Set<string>();
  const members = memberSubgroups
    .filter((ms) => !ms.member.deletedAt && !seen.has(ms.member.id))
    .map((ms) => {
      seen.add(ms.member.id);
      const m = ms.member;
      const program = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram) : null;
      const pct = memberProgramProgressPct(m.enrolledProgram, m.coursesCompleted);
      const student: PipelineStudent = {
        id: m.id,
        fullName: m.fullName,
        email: m.email,
        enrolledProgram: m.enrolledProgram,
        enrolledAt: m.enrolledAt,
        assessmentCompleted: m.assessmentCompleted,
        coursesCompleted: m.coursesCompleted,
        deletedAt: m.deletedAt,
        placementRecord: m.placementRecord,
        userCertifications: m.userCertifications,
        applications: m.applications,
      };
      const stage = getPipelineStage(student);
      return {
        id: m.id,
        fullName: m.fullName,
        email: m.email,
        enrolledProgram: program?.title ?? m.enrolledProgram,
        enrolledAt: m.enrolledAt,
        progressPct: pct,
        stage: PIPELINE_STAGE_LABELS[stage],
        placementRecord: m.placementRecord,
      };
    });

  return NextResponse.json({
    subgroups: subgroups.map((s) => s.subgroup),
    members,
  });
}
