import { prisma } from '@/lib/db/prisma';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';

/**
 * Resolves the subject of an AI tool run when a counselor or admin runs the
 * tool on behalf of a member ("In-Office Session" workflow).
 *
 * Default — when subjectMemberId is unset — the actor IS the subject (member
 * running the tool for themselves). The legacy member self-serve path.
 *
 * On-behalf-of — when subjectMemberId is set — the actor must be one of:
 *   - super_admin
 *   - admin
 *   - counselor with an active CounselorAssignment to the subject member
 *
 * Returns the resolved subject userId + actor metadata that callers should
 * record on AI history rows so the member's dashboard can later render
 * "Your session with {actor.fullName} on {date}" cards.
 *
 * Per /plan-ceo-review reframe (2026-04-26): the platform's job is to
 * AMPLIFY the in-person counselor workflow ("dad brings them in, builds the
 * profile while they're in office") not REPLACE it. This is the auth
 * boundary that makes that real.
 */
export type ActOnBehalfResolution =
  | { ok: true; subjectUserId: string; isOnBehalf: false; actorUserId: string; actorName: string | null }
  | { ok: true; subjectUserId: string; isOnBehalf: true; actorUserId: string; actorName: string | null }
  | { ok: false; status: 401 | 403 | 404; error: string };

export async function resolveActOnBehalf(
  actorUserId: string,
  subjectMemberId: string | null | undefined
): Promise<ActOnBehalfResolution> {
  // Default: actor runs tool on themselves (legacy member path)
  if (!subjectMemberId || subjectMemberId === actorUserId) {
    const actor = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { fullName: true },
    });
    return {
      ok: true,
      subjectUserId: actorUserId,
      isOnBehalf: false,
      actorUserId,
      actorName: actor?.fullName ?? null,
    };
  }

  // On-behalf-of: validate authority
  const subject = await prisma.user.findUnique({
    where: { id: subjectMemberId, deletedAt: null },
    select: { id: true },
  });
  if (!subject) {
    return { ok: false, status: 404, error: 'Member not found' };
  }

  const [superUser, adminUser, actor] = await Promise.all([
    isSuperAdmin(actorUserId),
    isAdmin(actorUserId),
    prisma.user.findUnique({ where: { id: actorUserId }, select: { fullName: true } }),
  ]);

  if (superUser || adminUser) {
    return {
      ok: true,
      subjectUserId: subjectMemberId,
      isOnBehalf: true,
      actorUserId,
      actorName: actor?.fullName ?? null,
    };
  }

  // Counselor: must have an active assignment to this member
  const assignment = await prisma.counselorAssignment.findFirst({
    where: {
      memberId: subjectMemberId,
      active: true,
      counselor: { userId: actorUserId, active: true },
    },
    select: { id: true },
  });
  if (!assignment) {
    return {
      ok: false,
      status: 403,
      error: 'You are not authorized to run tools on behalf of this member.',
    };
  }

  return {
    ok: true,
    subjectUserId: subjectMemberId,
    isOnBehalf: true,
    actorUserId,
    actorName: actor?.fullName ?? null,
  };
}
