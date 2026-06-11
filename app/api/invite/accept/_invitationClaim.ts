import { Prisma } from '@prisma/client';

type InviteTx = Prisma.TransactionClient;

export class InvitationClaimError extends Error {
  constructor() {
    super('INVITATION_NOT_CLAIMED');
  }
}

export async function claimPendingInvitationForAccept(
  tx: InviteTx,
  invitationId: string,
  acceptedById: string,
) {
  const claim = await tx.invitation.updateMany({
    where: {
      id: invitationId,
      status: 'pending',
      expiresAt: { gt: new Date() },
    },
    data: {
      status: 'accepted',
      acceptedAt: new Date(),
      acceptedById,
    },
  });

  if (claim.count !== 1) {
    throw new InvitationClaimError();
  }
}
