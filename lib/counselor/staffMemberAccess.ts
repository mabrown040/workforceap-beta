import { prisma } from '@/lib/db/prisma';
import { isAdminInOrg, isSuperAdmin } from '@/lib/auth/roles';

/**
 * Staff may view a member record if they are admin/super-admin in the
 * member's org, or the actively assigned counselor.
 *
 * Previously this used a global `isAdmin()` check which allowed an admin in
 * Org A to read any Org B member's profile, resume, notes, messages, and
 * points — the cross-tenant IDOR flagged in AUDIT-2026-05-16 §C-T1.
 * `isAdminInOrg` requires the staff user to belong to the member's
 * organization (super-admin still bypasses for platform ops).
 */
export async function assertStaffCanAccessMemberRecord(
  staffUserId: string,
  memberId: string
): Promise<boolean> {
  // Super-admins bypass tenant scope (platform ops). Check first to skip
  // the member lookup for them.
  if (await isSuperAdmin(staffUserId)) return true;

  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: { organizationId: true },
  });
  if (!member?.organizationId) return false;

  if (await isAdminInOrg(staffUserId, member.organizationId)) return true;

  const assigned = await prisma.counselorAssignment.findFirst({
    where: {
      memberId,
      active: true,
      counselor: { userId: staffUserId, active: true },
    },
    select: { id: true },
  });
  return !!assigned;
}
