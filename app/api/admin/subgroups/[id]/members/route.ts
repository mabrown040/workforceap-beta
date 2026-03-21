import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { memberProgramProgressPct } from '@/lib/partner/memberProgress';
import { getPipelineStage, PIPELINE_STAGE_LABELS, type PipelineStudent } from '@/lib/pipeline/stage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: subgroupId } = await params;
  const subgroup = await prisma.subgroup.findUnique({
    where: { id: subgroupId },
    include: { leader: { select: { fullName: true, email: true } } },
  });
  if (!subgroup) return NextResponse.json({ error: 'Subgroup not found' }, { status: 404 });

  const memberSubgroups = await prisma.memberSubgroup.findMany({
    where: { subgroupId },
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
      assigner: { select: { fullName: true } },
    },
    orderBy: { assignedAt: 'desc' },
  });

  const members = memberSubgroups
    .filter((ms) => !ms.member.deletedAt)
    .map((ms) => {
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
        assignedAt: ms.assignedAt,
        assignmentType: ms.assignmentType,
        assignedBy: ms.assigner?.fullName,
      };
    });

  return NextResponse.json({
    subgroup: {
      id: subgroup.id,
      name: subgroup.name,
      type: subgroup.type,
      leader: subgroup.leader,
    },
    members,
  });
}
