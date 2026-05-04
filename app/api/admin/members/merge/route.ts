import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

/**
 * POST /api/admin/members/merge
 *
 * Body: { primaryId: string, secondaryId: string }
 *
 * Merges secondary member into primary:
 * 1. Repoints foreign-key relations from secondary → primary
 * 2. Merges scalar fields (secondary fills gaps where primary is null)
 * 3. Soft-deletes secondary
 * 4. Logs merge in WorkflowDiagnostic
 *
 * Returns: { ok: true, primaryId, secondaryId, repointed: string[], mergedFields: string[] }
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { await requireAdmin(user.id); } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { primaryId?: string; secondaryId?: string };
  const { primaryId, secondaryId } = body;
  if (!primaryId || !secondaryId || primaryId === secondaryId) {
    return NextResponse.json({ error: 'primaryId and secondaryId required and must differ' }, { status: 400 });
  }

  const [primary, secondary] = await Promise.all([
    prisma.user.findUnique({ where: { id: primaryId } }),
    prisma.user.findUnique({ where: { id: secondaryId } }),
  ]);

  if (!primary || !secondary) {
    return NextResponse.json({ error: 'One or both members not found' }, { status: 404 });
  }
  if (primary.deletedAt || secondary.deletedAt) {
    return NextResponse.json({ error: 'Cannot merge deleted members' }, { status: 400 });
  }

  const repointed: string[] = [];
  const mergedFields: string[] = [];

  await prisma.$transaction(async (tx) => {
    // Helper: update a model's userId FK from secondary → primary
    async function repoint(model: string, field: string, extraWhere?: Record<string, unknown>) {
      try {
        // @ts-expect-error — dynamic model access
        const count = await tx[model].updateMany({
          where: { [field]: secondaryId, ...(extraWhere ?? {}) },
          data: { [field]: primaryId },
        });
        if (count.count > 0) repointed.push(`${model}(${count.count})`);
      } catch {
        // Log but don't fail the whole merge for non-critical relations
        repointed.push(`${model}(skipped — constraint conflict)`);
      }
    }

    // 1. Repoint relations (order: leaf tables first, avoid unique-constraint collisions)
    await repoint('applicationMessage', 'authorId');
    await repoint('message', 'authorId');
    await repoint('memberEvent', 'userId');
    await repoint('weeklyRecap', 'userId');
    await repoint('aiToolResult', 'userId');
    await repoint('goal', 'userId');
    await repoint('resourceProgress', 'userId');
    await repoint('pathwayStepProgress', 'userId');
    await repoint('trainingAccessRequest', 'userId');
    await repoint('workflowDiagnostic', 'actorUserId');
    await repoint('auditLog', 'actorUserId');
    await repoint('invitation', 'inviterId');
    await repoint('invitation', 'accepterId');
    await repoint('programChangeRequest', 'userId');
    await repoint('programChangeRequest', 'reviewerId');
    await repoint('partnerReferral', 'memberId');
    await repoint('partnerReferral', 'assigneeId');
    await repoint('partnerOutreachLog', 'memberId');
    await repoint('partnerOutreachLog', 'authorId');
    await repoint('portalWorkflowEvent', 'userId');
    await repoint('jobPostingApplication', 'userId');
    await repoint('aiJobMatch', 'userId');
    await repoint('memberNextBestAction', 'userId');
    await repoint('jobApplication', 'userId');
    await repoint('pointsTransaction', 'userId');
    await repoint('pointsTransaction', 'awarderId');
    await repoint('memberSubgroup', 'userId');
    await repoint('memberSubgroup', 'assignerId');
    await repoint('subgroupLeader', 'userId');
    await repoint('messageThread', 'memberId');
    await repoint('messageThread', 'counselorId');
    await repoint('messageThread', 'staffId');
    await repoint('application', 'userId');
    await repoint('learningProgress', 'userId');
    await repoint('userCertification', 'userId');
    await repoint('readinessChecklist', 'userId');
    await repoint('benefitRequest', 'userId');
    await repoint('counselorAssignment', 'memberId');
    await repoint('counselorNote', 'memberId');
    await repoint('counselorNote', 'authorId');
    await repoint('placementRecord', 'userId');
    await repoint('placedOutcome', 'userId');
    await repoint('mentorSession', 'memberId');
    await repoint('userRole', 'userId');
    await repoint('courseEnrollment', 'userId');
    await repoint('courseEnrollment', 'adminId');
    await repoint('preScreeningResponse', 'userId');
    await repoint('preScreeningDraft', 'userId');

    // Handle unique-constrained relations carefully
    // Profile has unique userId — move only if primary lacks one
    const primaryProfile = await tx.profile.findUnique({ where: { userId: primaryId } });
    const secondaryProfile = await tx.profile.findUnique({ where: { userId: secondaryId } });
    if (!primaryProfile && secondaryProfile) {
      await tx.profile.update({ where: { userId: secondaryId }, data: { userId: primaryId } });
      repointed.push('profile(1)');
    }

    // MemberPoints has implicit unique on userId — move only if primary lacks
    const primaryPoints = await tx.memberPoints.findUnique({ where: { userId: primaryId } });
    const secondaryPoints = await tx.memberPoints.findUnique({ where: { userId: secondaryId } });
    if (!primaryPoints && secondaryPoints) {
      await tx.memberPoints.update({ where: { userId: secondaryId }, data: { userId: primaryId } });
      repointed.push('memberPoints(1)');
    }

    // 2. Merge scalar fields (secondary fills gaps where primary is null)
    const updateData: Record<string, unknown> = {};
    const scalarFields: Array<{ key: string; value: unknown }> = [
      { key: 'phone', value: primary.phone ?? secondary.phone },
      { key: 'assessmentCompleted', value: primary.assessmentCompleted || secondary.assessmentCompleted },
      { key: 'assessmentCompletedAt', value: primary.assessmentCompletedAt ?? secondary.assessmentCompletedAt },
      { key: 'assessmentScore', value: primary.assessmentScore ?? secondary.assessmentScore },
      { key: 'assessmentScorePct', value: primary.assessmentScorePct ?? secondary.assessmentScorePct },
      { key: 'programInterest', value: primary.programInterest ?? secondary.programInterest },
      { key: 'enrolledProgram', value: primary.enrolledProgram ?? secondary.enrolledProgram },
      { key: 'enrolledAt', value: primary.enrolledAt ?? secondary.enrolledAt },
      { key: 'interviewEligible', value: primary.interviewEligible || secondary.interviewEligible },
      { key: 'interviewRequestedAt', value: primary.interviewRequestedAt ?? secondary.interviewRequestedAt },
      { key: 'interviewCompletedAt', value: primary.interviewCompletedAt ?? secondary.interviewCompletedAt },
      { key: 'onboardingCompletedAt', value: primary.onboardingCompletedAt ?? secondary.onboardingCompletedAt },
      { key: 'workspaceEmail', value: primary.workspaceEmail ?? secondary.workspaceEmail },
      { key: 'wioaQualificationJson', value: primary.wioaQualificationJson ?? secondary.wioaQualificationJson },
      { key: 'careerRecommendationJson', value: primary.careerRecommendationJson ?? secondary.careerRecommendationJson },
    ];

    for (const { key, value } of scalarFields) {
      if (value !== null && value !== undefined && value !== primary[key as keyof typeof primary]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateData[key] = value;
        mergedFields.push(key);
      }
    }

    // Merge JSON arrays: coursesCompleted — union of both
    const primaryCourses = parseCourseSlugList(primary.coursesCompleted);
    const secondaryCourses = parseCourseSlugList(secondary.coursesCompleted);
    const mergedCourses = Array.from(new Set([...primaryCourses, ...secondaryCourses]));
    if (mergedCourses.length > primaryCourses.length) {
      updateData.coursesCompleted = JSON.stringify(mergedCourses);
      mergedFields.push('coursesCompleted');
    }

    if (Object.keys(updateData).length > 0) {
      await tx.user.update({ where: { id: primaryId }, data: updateData });
    }

    // 3. Soft-delete secondary
    await tx.user.update({
      where: { id: secondaryId },
      data: { deletedAt: new Date(), email: `${secondary.email}.merged-${secondaryId}` },
    });

    // 4. Log merge
    await tx.workflowDiagnostic.create({
      data: {
        workflow: 'member_merge',
        status: 'ok',
        actorUserId: user.id,
        method: 'manual_merge',
        summary: `Merged member ${secondaryId} into ${primaryId}`,
        metadata: {
          primaryId,
          secondaryId,
          repointed,
          mergedFields,
          secondaryEmail: secondary.email,
          primaryEmail: primary.email,
        },
      },
    });
  });

  return NextResponse.json({ ok: true, primaryId, secondaryId, repointed, mergedFields });
}

function parseCourseSlugList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as string[];
  try { return JSON.parse(String(raw)) as string[]; } catch { return []; }
}
