import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getOrCreateMemberCounselorThread } from '@/lib/messages/counselorThread';
import type { PipelineBoardStage, MemberStatus } from '@prisma/client';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import {
  CURRICULUM_MIGRATION_PENDING_CODE,
  CURRICULUM_MIGRATION_PENDING_MESSAGE,
  isCurriculumMigrationPending,
} from '@/lib/content/programs';

const MAX_MEMBERS = 100;

const stageValues = ['applied', 'enrolled', 'in_training', 'certified', 'job_searching', 'placed'] as const;
const memberStatusValues = ['active', 'inactive', 'placed'] as const;

const bodySchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1).max(MAX_MEMBERS),
  pipelineStage: z.enum(stageValues).nullable().optional(),
  memberStatus: z.enum(memberStatusValues).nullable().optional(),
  counselorUserId: z.string().uuid().nullable().optional(),
  programSlug: z.string().min(1).nullable().optional(),
});

async function _POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { memberIds, pipelineStage, memberStatus, counselorUserId, programSlug } = parsed.data;
    const orgId = await getActorOrganizationId(user.id);

    // Validate that at least one field is being updated
    if (pipelineStage === undefined && memberStatus === undefined && counselorUserId === undefined && programSlug === undefined) {
      return NextResponse.json({ error: 'No updates specified' }, { status: 400 });
    }
    if (programSlug && isCurriculumMigrationPending(programSlug)) {
      return NextResponse.json(
        {
          error: CURRICULUM_MIGRATION_PENDING_MESSAGE,
          code: CURRICULUM_MIGRATION_PENDING_CODE,
        },
        { status: 409 },
      );
    }

    // Fetch members within tenant scope
    const members = await withTenantScope(orgId, (db) =>
      db.user.findMany({
        where: { id: { in: memberIds }, deletedAt: null },
        select: {
          id: true,
          email: true,
          fullName: true,
          enrolledProgram: true,
          pipelineBoardStage: true,
        },
      }),
    );

    if (members.length === 0) {
      return NextResponse.json({ error: 'No valid members found' }, { status: 404 });
    }

    // If counselor update requested, validate counselor exists, is active,
    // AND belongs to the actor's organization. Without the tenant scope a
    // crafted bulk-update request could attach in-tenant members to a
    // cross-tenant counselor — the dropdown in /admin/members itself uses
    // /api/admin/counselors (which is scoped), but the API accepts any
    // counselorUserId in the body.
    let counselor: { id: string; user: { id: string; fullName: string } } | null = null;
    if (counselorUserId) {
      counselor = await prisma.counselor.findFirst({
        where: {
          userId: counselorUserId,
          active: true,
          user: { organizationId: orgId },
        },
        include: { user: { select: { id: true, fullName: true } } },
      });
      if (!counselor) {
        return NextResponse.json({ error: 'Counselor not found or inactive' }, { status: 400 });
      }
    }

    let updatedCount = 0;
    const errors: string[] = [];

    for (const member of members) {
      try {
        const updates: {
          pipelineBoardStage?: PipelineBoardStage | null;
          memberStatus?: MemberStatus | null;
          enrolledProgram?: string | null;
          enrolledAt?: Date | null;
          updatedAt?: Date;
        } = {};

        if (pipelineStage !== undefined) {
          updates.pipelineBoardStage = pipelineStage as PipelineBoardStage | null;
        }
        if (memberStatus !== undefined) {
          updates.memberStatus = memberStatus as MemberStatus | null;
        }
        if (programSlug !== undefined) {
          updates.enrolledProgram = programSlug;
          if (programSlug && !member.enrolledProgram) {
            updates.enrolledAt = new Date();
          }
        }
        updates.updatedAt = new Date();

        await withTenantScope(orgId, (db) =>
          db.user.updateMany({
            where: { id: member.id },
            data: updates,
          }),
        );

        // Handle counselor assignment
        if (counselorUserId !== undefined) {
          if (counselorUserId === null) {
            // Unassign: deactivate all active assignments
            await prisma.counselorAssignment.updateMany({
              where: { memberId: member.id, active: true },
              data: { active: false },
            });
            const thread = await getOrCreateMemberCounselorThread(member.id);
            await prisma.messageThread.update({
              where: { id: thread.id },
              data: { counselorUserId: null },
            });
          } else if (counselor) {
            const existingPair = await prisma.counselorAssignment.findUnique({
              where: {
                counselorId_memberId: { counselorId: counselor.id, memberId: member.id },
              },
            });

            await prisma.$transaction(async (tx) => {
              await tx.counselorAssignment.updateMany({
                where: { memberId: member.id, active: true },
                data: { active: false },
              });
              if (existingPair) {
                await tx.counselorAssignment.update({
                  where: { id: existingPair.id },
                  data: { active: true },
                });
              } else {
                await tx.counselorAssignment.create({
                  data: {
                    counselorId: counselor.id,
                    memberId: member.id,
                    active: true,
                  },
                });
              }
            });

            const thread = await getOrCreateMemberCounselorThread(member.id);
            await prisma.messageThread.update({
              where: { id: thread.id },
              data: { counselorUserId: counselor.user.id },
            });
          }
        }

        await auditLog({
          actorUserId: user.id,
          action: 'bulk_update_member',
          targetType: 'user',
          targetId: member.id,
          metadata: {
            pipelineStage: pipelineStage ?? null,
            memberStatus: memberStatus ?? null,
            counselorUserId: counselorUserId ?? null,
            programSlug: programSlug ?? null,
            previousProgram: member.enrolledProgram,
            previousStage: member.pipelineBoardStage,
          },
        });
        await logAuditEvent({
          user: { id: user.id, role: 'admin' },
          verb: 'updated',
          object: { type: 'MemberBulkUpdate', id: member.id },
          result: {
            success: true,
            extensions: {
              orgId,
              pipelineStage: pipelineStage ?? null,
              memberStatus: memberStatus ?? null,
              counselorUserId: counselorUserId ?? null,
              programSlug: programSlug ?? null,
              previousProgram: member.enrolledProgram,
              previousStage: member.pipelineBoardStage,
            },
          },
          request: auditRequestMeta(request),
          orgId,
        });

        updatedCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${member.fullName} (${member.email}): ${msg}`);
        console.error(`[bulk-update] failed for ${member.id}:`, err);
      }
    }

    return NextResponse.json({
      updated: updatedCount,
      total: members.length,
      errors,
    });
  } catch (error) {
    console.error('/admin/members/bulk-update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
