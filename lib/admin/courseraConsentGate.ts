/** Consent gates Coursera seat activation, never signup. */
export function courseraApprovalBlockedByConsent(
  profile: { isMinor: boolean; parentalConsentGiven: boolean } | null | undefined,
): boolean {
  return Boolean(profile?.isMinor && !profile.parentalConsentGiven);
}

export const MINOR_CONSENT_REQUIRED_MESSAGE =
  'Guardian consent is required before activating a Coursera seat for a minor.';
