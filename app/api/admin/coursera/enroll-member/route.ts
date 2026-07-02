import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId, getSubjectOrganizationId } from '@/lib/tenant/organization';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { getB4BOrgId } from '@/lib/coursera/b4bClient';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { EnrollStateError, runEnrollStateMachine } from '@/lib/coursera/enrollState';
import { buildB4BPort, writeEnrollAudit } from '@/lib/coursera/enrollPort';
import { captureApiError } from '@/lib/observability/captureApiError';

/**
 * POST /api/admin/coursera/enroll-member
 * Body: `{ memberId: string, courseraCourseId?: string }`
 *
 * Admin one-click enrollment: runs the exact self-service state machine
 * (invite → membership → enroll, `lib/coursera/enrollState.ts`) with the
 * admin as the audit actor and the member as the target — the path the
 * self-service route's audit comment reserved for "a future
 * admin-impersonation enroll path".
 *
 * When `courseraCourseId` is omitted, the member is enrolled into the FIRST
 * course of their assigned program — "get them started" semantics. The
 * program-level invite + membership steps cover the whole Learning Path;
 * subsequent courses are one click each from the member's own dashboard.
 *
 * Guardrails (server-enforced):
 *   - admin-only + same-tenant (mirrors the approval-toggle route);
 *   - `courseraEnrollmentApproved` must already be true → 409 otherwise.
 *     This button does NOT auto-approve: approval is the budget gate and
 *     stays an explicit, separately-audited decision;
 *   - member must have an assigned program that exists in the catalog;
 *   - every B4B write lands in `audit_logs` with `enrolledByAdmin`.
 */
const bodySchema = z.object({
  memberId: z.string().min(1),
  courseraCourseId: z.string().trim().min(1).optional(),
});

async function _POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await requireAdmin(user.id);

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { memberId } = parsed.data;

    // Tenant scoping mirrors the approval-toggle route: operate in the
    // subject's org and refuse cross-tenant actors.
    const subjectOrgId = await getSubjectOrganizationId(memberId);
    const actorOrgId = await getActorOrganizationId(user.id);
    if (actorOrgId !== subjectOrgId) {
      return NextResponse.json({ error: 'Forbidden — cross-tenant' }, { status: 403 });
    }

    const member = await withTenantScope(subjectOrgId, (db) =>
      db.user.findUnique({
        where: { id: memberId },
        select: {
          id: true,
          email: true,
          fullName: true,
          enrolledProgram: true,
          courseraEnrollmentApproved: true,
        },
      }),
    );
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    if (!member.email) {
      return NextResponse.json(
        { error: 'Member has no email on file.', code: 'NO_EMAIL' },
        { status: 409 },
      );
    }
    if (!member.courseraEnrollmentApproved) {
      return NextResponse.json(
        {
          error: 'Member is not approved for Coursera enrollment. Approve them first — approval is the seat-budget gate.',
          code: 'NOT_APPROVED',
        },
        { status: 409 },
      );
    }
    if (!member.enrolledProgram) {
      return NextResponse.json(
        { error: 'Member has no assigned program.', code: 'NO_PROGRAM' },
        { status: 409 },
      );
    }
    const discoveredProgram = DISCOVERED_COURSERA_PROGRAMS[member.enrolledProgram];
    if (!discoveredProgram || discoveredProgram.courses.length === 0) {
      return NextResponse.json(
        { error: 'Program not in Coursera catalog.', code: 'PROGRAM_NOT_MAPPED' },
        { status: 409 },
      );
    }

    const requestedCourseId = parsed.data.courseraCourseId;
    const course = requestedCourseId
      ? discoveredProgram.courses.find((c) => c.courseId === requestedCourseId)
      : discoveredProgram.courses[0];
    if (!course) {
      return NextResponse.json(
        { error: "Course not in the member's program.", code: 'COURSE_NOT_IN_PROGRAM' },
        { status: 400 },
      );
    }

    const externalId = member.email.trim().toLowerCase();
    let result;
    try {
      result = await runEnrollStateMachine(buildB4BPort(), {
        orgId: getB4BOrgId(),
        programId: discoveredProgram.courseraProgramId,
        courseraCourseId: course.courseId,
        externalId,
        email: member.email,
        fullName: member.fullName ?? member.email,
      });
    } catch (err) {
      if (err instanceof EnrollStateError) {
        await Promise.allSettled(
          err.events.map((event) =>
            writeEnrollAudit({
              actorUserId: user.id,
              actorRole: 'admin',
              targetUserId: member.id,
              event,
            }),
          ),
        );
        captureApiError(err, {
          route: 'admin/coursera/enroll-member',
          extra: { memberId: member.id, adminId: user.id, step: err.step, httpStatus: err.httpStatus },
        });
        const adminFacing =
          err.httpStatus >= 500
            ? 'Coursera is temporarily unavailable. Try again in a moment.'
            : err.message;
        return NextResponse.json(
          { error: adminFacing, step: err.step, code: 'B4B_FAILURE' },
          { status: 502 },
        );
      }
      captureApiError(err, {
        route: 'admin/coursera/enroll-member',
        extra: { memberId: member.id, adminId: user.id },
      });
      return NextResponse.json({ error: 'Unexpected error during enrollment.' }, { status: 500 });
    }

    // Sequential, same as the self-service route: the audit trail should read
    // in state-graph order.
    for (const event of result.events) {
      await writeEnrollAudit({
        actorUserId: user.id,
        actorRole: 'admin',
        targetUserId: member.id,
        event,
      }).catch((auditErr) => {
        captureApiError(auditErr, {
          route: 'admin/coursera/enroll-member',
          extra: { memberId: member.id, step: event.step, note: 'audit-write-failed' },
        });
      });
    }

    if (result.status === 'enrolled' || result.status === 'membership-created-and-enrolled') {
      void triggerAutoSyncBestEffort({
        wapUserId: member.id,
        orgId: subjectOrgId,
        adminId: user.id,
        email: member.email,
        enrolledProgram: member.enrolledProgram,
      }).catch(() => {
        /* fire-and-forget */
      });
    }

    return NextResponse.json({
      status: result.status,
      message: result.message,
      courseName: course.name,
    });
  } catch (error) {
    console.error('/admin/coursera/enroll-member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Same best-effort post-enroll seed as the self-service route, with the
 * admin recorded as `enrolledByAdmin` for the sync bookkeeping. */
async function triggerAutoSyncBestEffort(args: {
  wapUserId: string;
  orgId: string;
  adminId: string;
  email: string;
  enrolledProgram: string | null;
}): Promise<void> {
  const { listCourseraIdentityMappingsForUser } = await import('@/lib/xapi/mappings');
  const mappings = await listCourseraIdentityMappingsForUser(args.wapUserId).catch(
    () => [] as Array<{ courseraEmail: string | null }>,
  );
  const courseraEmail = mappings.find((m) => m.courseraEmail)?.courseraEmail ?? args.email;
  if (!courseraEmail) return;

  const { syncUserFromB4B } = await import('@/lib/coursera/syncUserFromB4B');
  await syncUserFromB4B({
    email: courseraEmail.toLowerCase(),
    wapUserId: args.wapUserId,
    orgId: args.orgId,
    enrolledByAdmin: args.adminId,
    existingEnrolledProgram: args.enrolledProgram,
  }).catch(() => {
    /* swallow — auto-sync is fire-and-forget */
  });
}

export const POST = withApiGuc(_POST);
