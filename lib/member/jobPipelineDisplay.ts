/**
 * Display helpers for the member Job Pipeline kit.
 * Keep empty-state copy short enough to read on a phone without truncation.
 */
export const JOBS_EMPTY_RECOMMENDATIONS = {
  title: 'No matching roles yet',
  description: 'Update your profile so we can match you to openings.',
  primaryCta: 'Update profile',
  secondaryCta: 'Browse jobs',
} as const;

export function displayJobLocation(location: string | null | undefined): string {
  const value = location?.trim();
  if (!value || value === '—') return 'Location not listed';
  return value;
}
