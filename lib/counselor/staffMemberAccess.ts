import { prisma } from '@/lib/db/prisma';
import { isAdmin } from '@/lib/auth/roles';

/**
 * Staff may view a member record if they are admin or the actively assigned counselor.
 */
export async function assertStaffCanAccessMemberRecord(
  staffUserId: string,
  memberId: string
): Promise<boolean> {
  if (await isAdmin(staffUserId)) return true;
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
