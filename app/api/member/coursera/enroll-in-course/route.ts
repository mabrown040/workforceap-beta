import { NextResponse } from 'next/server';

import { getUser } from '@/lib/auth/server';
import { auditLog } from '@/lib/audit';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import {
  createProgramMembership,
  enrollUserInCourse,
  getB4BOrgId,
  inviteUserToProgram,
  listUsers,
  type B4BUser,
} from '@/lib/coursera/b4bClient';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import {
  EnrollStateError,
  runEnrollStateMachine,
  type B4BPort,
  type EnrollAuditEvent,
} from '@/lib/coursera/enrollState';
import { captureApiError } from '@/lib/observability/captureApiError';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { logAuditEvent } from '@/lib/audit/log';

/**
 * POST /api/member/coursera/enroll-in-course
 * Body: `{ courseraCourseId: string }` — that's all the client sends.
 * The server resolves the active program, B4B org, and invite/membership/
 * enroll path from the authenticated session.
 *
 * Eligibility rules (server-enforced — never trust the client):
 *   1. `User.courseraEnrollmentApproved` must be `true` → otherwise 403.
 *      The flag is set by the counselor approval / admin toggle paths
 *      documented in `docs/COURSERA-ENROLLMENT-FLOW.md`.
 *   2. `User.enrolledProgram` must be set (member has chosen a program) →
 *      otherwise 400.
 *   3. The requested `courseraCourseId` must belong to the user's enrolled
 *      program (cross-program click protection) → otherwise 400.
 *
 * State graph (delegated to `lib/coursera/enrollState.ts`):
 *   - Not in B4B roster        → invite (Coursera emails them) → 'invited'
 *   - In roster, not in program → membership + enroll          → 'membership-created-and-enrolled'
 *   - In program, not in course → enroll                        → 'enrolled'
 *   - Already enrolled          → 200 + 'already-enrolled' (idempotent re-clicks)
 *
 * Every B4B write produces an `audit_logs` row whose actor is the
 * authenticated user (the member is the actor for self-service enrolls).
 * We chose `audit_logs` rather than inventing a new table because the
 * existing infra already records WIOA reviews, role changes, and admin
 * impersonation — the Coursera seat-spend trail belongs in the same place.
 *
 * 4xx behavior: a 4xx from Coursera (e.g. "already enrolled") is folded
 * into a 200 status='already-enrolled' so a double-click doesn't surface
 * an error toast. 5xx and unknown 4xx propagate as 502 with the audit
 * trail of whatever did succeed before the failure.
 */
async function _POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email) {
      return NextResponse.json(
        { error: 'No email on file. Contact your counselor.' },
        { status: 400 },
      );
    }
  
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const o = body as Record<string, unknown>;
    const courseraCourseId =
      typeof o.courseraCourseId === 'string' ? o.courseraCourseId.trim() : '';
    if (!courseraCourseId) {
      return NextResponse.json({ error: 'courseraCourseId required' }, { status: 400 });
    }
  
    let orgId: string;
    try {
      orgId = await getActorOrganizationId(user.id);
    } catch (err) {
      captureApiError(err, { route: 'member/coursera/enroll-in-course', extra: { stage: 'getActorOrganizationId' } });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  
    // Read the user's eligibility + program through the tenant-scoped proxy.
    // Self-only: there is no `memberId` in the body, by design.
    const dbUser = await withTenantScope(orgId, (db) =>
      db.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          enrolledProgram: true,
          courseraEnrollmentApproved: true,
        },
      }),
    );
    if (!dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    // Gate 1: eligibility flag.
    if (!dbUser.courseraEnrollmentApproved) {
      return NextResponse.json(
        {
          error: 'Enrollment locked',
          code: 'NOT_APPROVED',
          message:
            "Enrollment is locked. Your counselor will enable this when funding is confirmed.",
        },
        { status: 403 },
      );
    }
  
    // Gate 2: enrolled program.
    if (!dbUser.enrolledProgram) {
      return NextResponse.json(
        {
          error: 'Choose a program first',
          code: 'NO_PROGRAM',
        },
        { status: 400 },
      );
    }
  
    // Gate 3: course belongs to the user's program.
    const discoveredProgram = DISCOVERED_COURSERA_PROGRAMS[dbUser.enrolledProgram];
    if (!discoveredProgram) {
      return NextResponse.json(
        { error: 'Program not in Coursera catalog', code: 'PROGRAM_NOT_MAPPED' },
        { status: 400 },
      );
    }
    const courseInProgram = discoveredProgram.courses.find(
      (c) => c.courseId === courseraCourseId,
    );
    if (!courseInProgram) {
      return NextResponse.json(
        {
          error: 'Course not in your program',
          code: 'COURSE_NOT_IN_PROGRAM',
        },
        { status: 400 },
      );
    }
  
    // Build the B4B port. `listUsersByEmail` walks the roster pages until it
    // finds the email or runs out — the roster is < 10k for WAP today, but
    // we cap at 50 pages of 200 (10k users) to keep the worst-case bounded.
    const b4bOrgId = getB4BOrgId();
    const programId = discoveredProgram.courseraProgramId;
  
    const port: B4BPort = {
      listUsersByEmail: async (email: string) => {
        const target = email.trim().toLowerCase();
        const PAGE_LIMIT = 200;
        const SAFETY_PAGES = 50;
        let start = 0;
        for (let pages = 0; pages < SAFETY_PAGES; pages += 1) {
          const result = await listUsers({ start, limit: PAGE_LIMIT });
          const hit = result.elements.find(
            (u: B4BUser) => (u.email ?? '').trim().toLowerCase() === target,
          );
          if (hit) return hit;
          if (result.elements.length === 0) return null;
          const total = result.paging.total ?? 0;
          if (total > 0 && start + result.elements.length >= total) return null;
          if (result.elements.length < PAGE_LIMIT) return null;
          start += result.elements.length;
        }
        return null;
      },
      invite: async (args) =>
        inviteUserToProgram(args.orgId, args.programId, {
          externalId: args.externalId,
          fullName: args.fullName,
          email: args.email,
          sendEmail: true,
        }),
      createMembership: async (args) =>
        createProgramMembership(args.orgId, args.programId, {
          externalId: args.externalId,
          fullName: args.fullName,
          email: args.email,
        }),
      enroll: async (args) =>
        enrollUserInCourse(args.orgId, args.programId, {
          externalId: args.externalId,
          contentType: 'Course',
          contentId: args.contentId,
          action: 'ENROLL',
        }),
    };
  
    const externalId = user.email.trim().toLowerCase();
    let result;
    try {
      result = await runEnrollStateMachine(port, {
        orgId: b4bOrgId,
        programId,
        courseraCourseId,
        externalId,
        email: user.email,
        fullName: dbUser.fullName ?? user.email,
      });
    } catch (err) {
      if (err instanceof EnrollStateError) {
        // Audit-log every step that DID happen before the failure. We swallow
        // audit errors so a logging-table outage can't mask the original error.
        await Promise.allSettled(
          err.events.map((event) => writeEnrollAudit(user.id, event)),
        );
        captureApiError(err, {
          route: 'member/coursera/enroll-in-course',
          extra: { userId: user.id, step: err.step, httpStatus: err.httpStatus },
        });
        const userFacing =
          err.httpStatus >= 500
            ? 'Coursera is temporarily unavailable. Please try again in a moment.'
            : err.message;
        return NextResponse.json(
          { error: userFacing, step: err.step, code: 'B4B_FAILURE' },
          { status: 502 },
        );
      }
      captureApiError(err, { route: 'member/coursera/enroll-in-course', extra: { userId: user.id } });
      return NextResponse.json(
        { error: 'Unexpected error during enrollment.' },
        { status: 500 },
      );
    }
  
    // Success path: audit each event sequentially. Sequential writes — not
    // parallel — because the audit_logs table has an index on (target_type,
    // target_id) and we want them to land in the same order as the B4B
    // calls so a downstream observer reading the audit trail sees the
    // state-graph order, not whatever Postgres scheduled.
    for (const event of result.events) {
      await writeEnrollAudit(user.id, event).catch((auditErr) => {
        // A failure to audit must NOT undo the enrollment — the seat is
        // already spent. We surface the failure for triage but keep the
        // success response the user sees.
        captureApiError(auditErr, {
          route: 'member/coursera/enroll-in-course',
          extra: { userId: user.id, step: event.step, note: 'audit-write-failed' },
        });
      });
    }
  
    // After a successful enroll, kick off the existing auto-sync so that
    // local CourseProgress rows seed quickly. We run it best-effort and
    // don't await — the UI's `router.refresh()` will pick up the seeded
    // rows on the next render or whenever the cron / xAPI replay catches up.
    if (result.status === 'enrolled' || result.status === 'membership-created-and-enrolled') {
      triggerAutoSyncBestEffort({
        wapUserId: user.id,
        orgId,
        email: user.email,
        enrolledProgram: dbUser.enrolledProgram,
      }).catch(() => {
        /* swallow — auto-sync is fire-and-forget */
      });
    }
  
    return NextResponse.json({
      status: result.status,
      message: result.message,
    });
  } catch (error) {
    console.error('/member/coursera/enroll-in-course:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Map an `EnrollAuditEvent` to a row in `audit_logs`. The schema columns
 * are `actor_user_id`, `action`, `target_type`, `target_id`, `metadata`,
 * `created_at` — see `prisma/schema.prisma` `model AuditLog`.
 */
async function writeEnrollAudit(actorUserId: string, event: EnrollAuditEvent): Promise<void> {
  await auditLog({
    actorUserId,
    action: event.action,
    // For a self-service member enroll the actor IS the subject — but we
    // record both the actor (user_id) and the subject (target_id) so a
    // future admin-impersonation enroll path can reuse this exact code
    // path with the admin as the actor and the member as the target.
    targetType: 'User',
    targetId: actorUserId,
    metadata: {
      step: event.step,
      programId: event.programId,
      contentId: event.contentId,
      externalId: event.externalId,
      b4bStatus: event.httpStatus,
      ...('alreadyEnrolled' in event && event.alreadyEnrolled
        ? { alreadyEnrolled: true }
        : {}),
    },
  });
  logAuditEvent({
    user: { id: actorUserId, role: 'member' },
    verb: event.action,
    object: { type: 'CourseraEnrollment', id: actorUserId },
    result: {
      success: true,
      extensions: { step: event.step, programId: event.programId, contentId: event.contentId },
    },
  }).catch(() => {});
}

/**
 * Best-effort auto-sync after a successful enroll. Uses the same library
 * function the dashboard auto-sync route uses — `syncUserFromB4B` —
 * because that's where the seeding + xAPI replay logic actually lives.
 * We don't call the auto-sync HTTP route to avoid a self-fan-out.
 *
 * Worst case (no Coursera identity mapping yet, e.g. the user just got
 * invited): we no-op silently. The cron / dashboard auto-sync trigger
 * will pick it up after the user accepts the invite.
 */
async function triggerAutoSyncBestEffort(args: {
  wapUserId: string;
  orgId: string;
  email: string;
  enrolledProgram: string | null;
}): Promise<void> {
  const { listCourseraIdentityMappingsForUser } = await import('@/lib/xapi/mappings');
  const mappings = await listCourseraIdentityMappingsForUser(args.wapUserId).catch(
    () => [] as Array<{ courseraEmail: string | null }>,
  );
  const courseraEmail =
    mappings.find((m) => m.courseraEmail)?.courseraEmail ?? args.email;
  if (!courseraEmail) return;

  const { syncUserFromB4B } = await import('@/lib/coursera/syncUserFromB4B');
  await syncUserFromB4B({
    email: courseraEmail.toLowerCase(),
    wapUserId: args.wapUserId,
    orgId: args.orgId,
    enrolledByAdmin: null,
    existingEnrolledProgram: args.enrolledProgram,
  }).catch(() => {
    /* swallow — auto-sync is fire-and-forget */
  });
}
export const POST = withApiGuc(_POST);
