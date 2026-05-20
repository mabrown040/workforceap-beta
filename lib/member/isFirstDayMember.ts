const FIRST_DAY_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Members created within the last 24 hours are eligible for the first-visit onboarding tour. */
export function isFirstDayMember(createdAt: Date | null | undefined): boolean {
  if (!createdAt) return false;
  return Date.now() - createdAt.getTime() < FIRST_DAY_WINDOW_MS;
}
