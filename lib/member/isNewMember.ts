const NEW_MEMBER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Members created within the last 7 days see week-one onboarding surfaces. */
export function isNewMember(createdAt: Date | null | undefined): boolean {
  if (!createdAt) return false;
  return Date.now() - createdAt.getTime() < NEW_MEMBER_WINDOW_MS;
}

export function secondsSinceAccountCreation(createdAt: Date | null | undefined): number | null {
  if (!createdAt) return null;
  return Math.round((Date.now() - createdAt.getTime()) / 1000);
}
