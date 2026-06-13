import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin, isAdminInOrg, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { memberProgramProgressPct } from '@/lib/partner/memberProgress';
import { getPipelineStage, PIPELINE_STAGE_LABELS, type PipelineStudent } from '@/lib/pipeline/stage';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const GET = withApiGuc(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: subgroupId } = await params;
  // Pull leader's organizationId so we can gate on isAdminInOrg before
  // returning any member data. Without this, any admin in any org could
  // read full member rosters / PII for any subgroup (AUDIT §C-T4).
  const subgroup = await prisma.$transaction((tx) => tx.subgroup.findUnique({
    where: { id: subgroupId },
    include: { leader: { select: { fullName: true, email: true, organizationId: true } } },
  }));
  if (!subgroup) return NextResponse.json({ error: 'Subgroup not found' }, { status: 404 });

  const subgroupOrgId = subgroup.leader?.organizationId;
  if (!subgroupOrgId) {
    // Defensive: a subgroup whose leader has no org row is malformed; treat as not found.
    return NextResponse.json({ error: 'Subgroup not found' }, { status: 404 });
  }
  if (!(await isSuperAdmin(user.id)) && !(await isAdminInOrg(user.id, subgroupOrgId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const memberSubgroups = await prisma.$transaction((tx) => tx.memberSubgroup.findMany({
    where: { subgroupId },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          email: true,
          enrolledProgram: true,
          enrolledAt: true,
          updatedAt: true,
          deletedAt: true,
          assessmentCompleted: true,
          placementRecord: {
            select: { employerName: true, jobTitle: true, salaryOffered: true, placedAt: true },
          },
          userCertifications: { select: { certName: true, earnedAt: true } },
          applications: { select: { status: true, submittedAt: true } },
          memberProgramProgress: {
            select: { programSlug: true, averagePercent: true, coursesCompleted: true },
          },
        },
      },
      assigner: { select: { fullName: true } },
    },
    orderBy: { assignedAt: 'desc' },
    take: 100,
  }));

  const members = memberSubgroups
    .filter((ms) => !ms.member.deletedAt)
    .map((ms) => {
      const m = ms.member;
      const program = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram) : null;
      const pct = memberProgramProgressPct(m.enrolledProgram, null, m.memberProgramProgress);
      const student: PipelineStudent = {
        id: m.id,
        fullName: m.fullName,
        email: m.email,
        enrolledProgram: m.enrolledProgram,
        enrolledAt: m.enrolledAt,
        assessmentCompleted: m.assessmentCompleted,
        deletedAt: m.deletedAt,
        placementRecord: m.placementRecord,
        userCertifications: m.userCertifications,
        applications: m.applications,
        memberProgramProgress: m.memberProgramProgress,
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

  } catch (error) {
    console.error('/admin/subgroups/[id]/members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

