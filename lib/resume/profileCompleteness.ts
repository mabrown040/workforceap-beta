type ProfileInput = {
  profilePhone?: string | null;
  profileAddress?: string | null;
  profileLinkedin?: string | null;
  profileBio?: string | null;
  employmentStatus?: string | null;
  educationLevel?: string | null;
} | null;

type UserInput = {
  fullName?: string | null;
  email?: string;
  enrolledProgram?: string | null;
  assessmentCompleted?: boolean | null;
} | null;

const PROFILE_FIELDS: Array<{ label: string; get: (p: ProfileInput, u: UserInput) => string | null | undefined }> = [
  { label: 'full name', get: (_, u) => u?.fullName },
  { label: 'email', get: (_, u) => u?.email },
  { label: 'phone', get: (p) => p?.profilePhone },
  { label: 'address', get: (p) => p?.profileAddress },
  { label: 'LinkedIn', get: (p) => p?.profileLinkedin },
  { label: 'bio', get: (p) => p?.profileBio },
  { label: 'employment status', get: (p) => p?.employmentStatus },
  { label: 'education level', get: (p) => p?.educationLevel },
  { label: 'enrolled program', get: (_, u) => u?.enrolledProgram },
  { label: 'skills assessment', get: (_, u) => (u?.assessmentCompleted ? 'done' : null) },
];

/**
 * Member-facing profile completeness. Returns 0-100 based on the union of
 * identity, contact, background, program, and readiness signals — the same
 * fields a member needs filled to be matched, served, and ready for resume
 * generation. Both /dashboard and /dashboard/profile must pass the full user
 * (including enrolledProgram and assessmentCompleted) so the value agrees
 * across surfaces.
 */
export function getProfileCompleteness(profile: ProfileInput, user: UserInput): number {
  if (!profile && !user) return 0;
  const filled = PROFILE_FIELDS.filter(({ get }) => {
    const v = get(profile, user);
    return v && String(v).trim();
  }).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

/** Returns the human-readable labels of fields that are empty. */
export function getProfileMissingFields(profile: ProfileInput, user: UserInput): string[] {
  return PROFILE_FIELDS
    .filter(({ get }) => {
      const v = get(profile, user);
      return !v || !String(v).trim();
    })
    .map(({ label }) => label);
}
