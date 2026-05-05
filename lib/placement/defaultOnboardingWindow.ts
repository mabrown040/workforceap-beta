/** Default employer onboarding window end: 180 days after placement date. */
export function defaultOnboardingWindowEnd(placedAt: Date): Date {
  const d = new Date(placedAt);
  d.setUTCDate(d.getUTCDate() + 180);
  return d;
}
