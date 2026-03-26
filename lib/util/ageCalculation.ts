/**
 * Age calculation and minor status utilities
 */

export function calculateAge(dob: Date | string): number {
  const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

export function isMinorAge(dob: Date | string | null): boolean {
  if (!dob) return false;
  return calculateAge(dob) < 18;
}

export function isYouthAge(dob: Date | string | null): boolean {
  if (!dob) return false;
  const age = calculateAge(dob);
  return age >= 14 && age < 18;
}

export function meetsMinimumAge(dob: Date | string | null, minimumAge: number | null): boolean {
  if (!minimumAge) return true;
  if (!dob) return false;
  return calculateAge(dob) >= minimumAge;
}

export type AgeGroup = 'under14' | 'youth14to17' | 'adult18plus';

export function getAgeGroup(dob: Date | string | null): AgeGroup {
  if (!dob) return 'adult18plus';
  const age = calculateAge(dob);
  if (age < 14) return 'under14';
  if (age < 18) return 'youth14to17';
  return 'adult18plus';
}

export function getAgeGroupLabel(ageGroup: AgeGroup): string {
  switch (ageGroup) {
    case 'under14':
      return 'Under 14';
    case 'youth14to17':
      return 'Youth (14-17)';
    case 'adult18plus':
      return 'Adult (18+)';
  }
}

/**
 * Determine if a job is appropriate for a given age group.
 * Pass `dob` when available so adult minimum-age rules (e.g. 21+) can be applied accurately.
 */
export function isJobAgeAppropriate(
  ageGroup: AgeGroup,
  job: {
    minimumAge?: number | null;
    youthAppropriate?: boolean;
  },
  dob?: Date | string | null
): boolean {
  // Under 14 - no jobs (COPPA compliance)
  if (ageGroup === 'under14') return false;
  
  // Youth (14-17) - only youth-appropriate jobs
  if (ageGroup === 'youth14to17') {
    if (!job.youthAppropriate) return false;
    if (job.minimumAge && job.minimumAge > 17) return false;
    return true;
  }
  
  // Adult (18+) — jobs may require 21+ (e.g. alcohol service); use dob when present
  if (job.minimumAge) {
    if (dob != null) return meetsMinimumAge(dob, job.minimumAge);
    return true;
  }
  
  return true;
}
