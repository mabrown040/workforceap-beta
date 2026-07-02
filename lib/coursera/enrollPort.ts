import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
import {
  createProgramMembership,
  enrollUserInCourse,
  inviteUserToProgram,
  listUsers,
  type B4BUser,
} from '@/lib/coursera/b4bClient';
import type { B4BPort, EnrollAuditEvent } from '@/lib/coursera/enrollState';

/**
 * Shared B4B port + audit writer for the enroll state machine
 * (`lib/coursera/enrollState.ts`). Two routes drive the same state graph:
 *   - POST /api/member/coursera/enroll-in-course   (member self-service;
 *     actor === target)
 *   - POST /api/admin/coursera/enroll-member       (admin one-click; actor
 *     is the admin, target is the member)
 * Keeping the port and the audit shape here guarantees both paths spend
 * seats and record the trail identically.
 */

/**
 * Roster lookups walk the whole B4B users list page-by-page (Coursera has no
 * email filter on this endpoint). A short-TTL cache absorbs double-clicks and
 * the admin-approves-then-enrolls sequence without re-scanning up to 50 pages
 * per click. TTL is deliberately short: after an invite, the learner appears
 * in the roster server-side, and a stale negative would just re-invite —
 * which the state machine already folds to success (invites are idempotent).
 */
const ROSTER_LOOKUP_TTL_MS = 60_000;
const rosterLookupCache = new Map<string, { at: number; user: B4BUser | null }>();

async function listUsersByEmailUncached(email: string): Promise<B4BUser | null> {
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
}

export function buildB4BPort(): B4BPort {
  return {
    listUsersByEmail: async (email: string) => {
      const key = email.trim().toLowerCase();
      const cached = rosterLookupCache.get(key);
      if (cached && Date.now() - cached.at < ROSTER_LOOKUP_TTL_MS) {
        return cached.user;
      }
      const user = await listUsersByEmailUncached(key);
      rosterLookupCache.set(key, { at: Date.now(), user });
      return user;
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
}

/** Test-only: reset the roster-lookup cache between cases. */
export function _resetRosterLookupCacheForTesting() {
  rosterLookupCache.clear();
}

/**
 * Map an `EnrollAuditEvent` to `audit_logs`. Actor and target diverge on the
 * admin path — the seat-spend trail must show WHO clicked (admin) and WHOSE
 * seat was spent (member). Self-service passes the same id for both.
 */
export async function writeEnrollAudit(args: {
  actorUserId: string;
  actorRole: 'member' | 'admin';
  targetUserId: string;
  event: EnrollAuditEvent;
}): Promise<void> {
  const { actorUserId, actorRole, targetUserId, event } = args;
  await auditLog({
    actorUserId,
    action: event.action,
    targetType: 'User',
    targetId: targetUserId,
    metadata: {
      step: event.step,
      programId: event.programId,
      contentId: event.contentId,
      externalId: event.externalId,
      b4bStatus: event.httpStatus,
      ...(actorUserId !== targetUserId ? { enrolledByAdmin: actorUserId } : {}),
      ...('alreadyEnrolled' in event && event.alreadyEnrolled
        ? { alreadyEnrolled: true }
        : {}),
    },
  });
  logAuditEvent({
    user: { id: actorUserId, role: actorRole },
    verb: event.action,
    object: { type: 'CourseraEnrollment', id: targetUserId },
    result: {
      success: true,
      extensions: { step: event.step, programId: event.programId, contentId: event.contentId },
    },
  }).catch(() => {});
}
