import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';

export function enrolledMembersInOrganizationWhere(organizationId: string) {
  return {
    organizationId,
    deletedAt: null,
    enrolledProgram: { not: null },
  };
}

export async function resolveAdminEnrolledMemberIds(
  actorUserId: string,
  take = 200,
): Promise<string[]> {
  const organizationId = await getActorOrganizationId(actorUserId);
  const members = await prisma.user.findMany({
    where: enrolledMembersInOrganizationWhere(organizationId),
    select: { id: true },
    take,
  });
  return members.map((m) => m.id);
}
