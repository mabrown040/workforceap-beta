import { prisma } from '@/lib/db/prisma';
import { isAdmin, isCounselor, isSuperAdmin } from '@/lib/auth/roles';
import { assertStaffCanAccessMemberRecord } from '@/lib/counselor/staffMemberAccess';
import { isCounselorWioaReviewStatus } from '@/lib/wioa/wioaReview';

/**
 * Who may review applications and record WIOA intake verification.
 *
 * Until 2026-09-19 only admins could approve/deny applications or set the
 * WIOA review status; counselors saw a read-only panel while 53 applications
 * sat pending at a 40-day median. Mike approved letting counselors act
 * (Slack, 2026-09-19 13:14 UTC). Admin behaviour is unchanged: the routes
 * keep their actor-org tenant scoping. Counselors are additionally limited
 * to members they are actively assigned to, via the same
 * `assertStaffCanAccessMemberRecord` gate the counselor student page uses.
 */
type ReviewActorRole = 'admin' | 'super_admin' | 'counselor';

type ReviewActor = { userId: string; role: ReviewActorRole };

export async function resolveReviewActor(userId: string): Promise<ReviewActor | null> {
  if (await isAdmin(userId)) {
    return { userId, role: (await isSuperAdmin(userId)) ? 'super_admin' : 'admin' };
  }
  if (await isCounselor(userId)) return { userId, role: 'counselor' };
  return null;
}

/** Counselors may only act on members they are actively assigned to. */
export async function canReviewActorActOnMember(actor: ReviewActor, memberId: string): Promise<boolean> {
  if (actor.role !== 'counselor') return true;
  return assertStaffCanAccessMemberRecord(actor.userId, memberId);
}

/**
 * Same rule, keyed by application id. The application is resolved inside the
 * actor's org (mirrors the `changeApplicationStatus` lookup) so a counselor
 * cannot learn anything about another tenant's application by guessing ids.
 */
export async function canReviewActorActOnApplication(
  actor: ReviewActor,
  applicationId: string,
  orgId: string,
): Promise<boolean> {
  if (actor.role !== 'counselor') return true;
  const application = await prisma.application.findFirst({
    where: { id: applicationId, user: { organizationId: orgId } },
    select: { userId: true },
  });
  if (!application) return false;
  return assertStaffCanAccessMemberRecord(actor.userId, application.userId);
}

export const COUNSELOR_WIOA_STATUS_FORBIDDEN_MESSAGE =
  'Counselors record intake verification only. The eligibility determination stays with the workforce board.';

/** Counselors can mark intake verified / not verified, but never `not_eligible`. */
export function canReviewActorSetWioaStatus(actor: ReviewActor, status: string): boolean {
  if (actor.role !== 'counselor') return true;
  return isCounselorWioaReviewStatus(status);
}
