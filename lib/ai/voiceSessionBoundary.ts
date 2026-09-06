import { prisma } from '@/lib/db/prisma';
import { requireGucContext } from '@/lib/db/gucContext';

export const VOICE_SESSION_RESPONSE_HEADERS = { 'Cache-Control': 'no-store, max-age=0' };
export const VOICE_SESSION_UNAVAILABLE_MESSAGE =
  'Voice coaching is temporarily unavailable. Please try again later.';
export const VOICE_SESSION_IDENTITY_MESSAGE =
  'Your account could not be verified for this voice session.';

/**
 * Call only after getUser() validates the Supabase login. Verify the live app
 * account, leaving portal roles and member-tool authorization to their gates.
 * A legacy case_manager profile currently maps to the anonymous RLS role,
 * despite carrying a verified user/org; that mapping is not an auth decision.
 */
export async function hasActiveVoiceSessionUser(userId: string): Promise<boolean> {
  const context = requireGucContext();
  if (
    context.userId !== userId ||
    !context.orgId ||
    context.role === 'system'
  ) {
    return false;
  }
  const organizationId = context.orgId;
  const user = await prisma.$transaction((tx) => tx.user.findFirst({
    where: { id: userId, organizationId, deletedAt: null },
    select: { id: true },
  }));
  return !!user;
}
