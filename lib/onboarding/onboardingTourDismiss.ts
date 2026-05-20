/** HTTP cookie set when a member skips the onboarding tour (scoped per user id). */
export const ONBOARDING_TOUR_DISMISSED_COOKIE = 'wa_onboarding_tour_dismissed';

const ONE_YEAR_SEC = 365 * 24 * 60 * 60;

export function onboardingTourDismissCookieValue(userId: string): string {
  return userId;
}

export function readOnboardingTourDismissedUserId(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|; )${ONBOARDING_TOUR_DISMISSED_COOKIE}=([^;]+)`)
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function setOnboardingTourDismissedCookie(userId: string): void {
  if (typeof document === 'undefined') return;
  const value = encodeURIComponent(onboardingTourDismissCookieValue(userId));
  document.cookie = `${ONBOARDING_TOUR_DISMISSED_COOKIE}=${value};path=/;max-age=${ONE_YEAR_SEC};SameSite=Lax`;
}

export function hasOnboardingTourDismissedCookie(userId: string): boolean {
  if (typeof document === 'undefined') return false;
  return readOnboardingTourDismissedUserId(document.cookie) === userId;
}
