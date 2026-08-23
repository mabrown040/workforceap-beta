import { NextResponse } from 'next/server';

import { getUser } from '@/lib/auth/server';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { getB4BOrgId } from '@/lib/coursera/b4bClient';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { EnrollStateError, runEnrollStateMachine } from '@/lib/coursera/enrollState';
import { buildB4BPort, writeEnrollAudit } from '@/lib/coursera/enrollPort';
import { captureApiError } from '@/lib/observability/captureApiError';
import { withApiGuc } from '@/lib/db/withRequestGuc';

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
  
    // Shared B4B port (lib/coursera/enrollPort.ts): roster lookup with a
    // short-TTL cache, plus the invite/membership/enroll write bindings —
    // identical machinery to the admin one-click route.
    const b4bOrgId = getB4BOrgId();
    const programId = discoveredProgram.courseraProgramId;

    const externalId = user.email.trim().toLowerCase();
    let result;
    try {
      result = await runEnrollStateMachine(buildB4BPort(), {
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
          err.events.map((event) =>
            writeEnrollAudit({ actorUserId: user.id, actorRole: 'member', targetUserId: user.id, event }),
          ),
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
      await writeEnrollAudit({ actorUserId: user.id, actorRole: 'member', targetUserId: user.id, event }).catch((auditErr) => {
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
 * Best-effort auto-sync after a successful enroll. Uses the same library
 * function the dashboard auto-sync route uses — `syncUserFromB4B` —
 * because that's where the seeding + xAPI replay logic actually lives.
 * We don't call the auto-sync HTTP route to avoid a self-fan-out.
 *
 * Worst case (no Coursera identity mapping yet, e.g. the user just got
 * invited): we no-op silently. The cron / member auto-sync route
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
