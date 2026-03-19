/**
 * Profile completeness for resume generation.
 * Returns 0-100 based on key fields.
 */
export function getProfileCompleteness(profile: {
  profilePhone?: string | null;
  profileAddress?: string | null;
  profileLinkedin?: string | null;
  profileBio?: string | null;
  employmentStatus?: string | null;
  educationLevel?: string | null;
} | null, user: { fullName?: string | null; email?: string } | null): number {
  if (!profile && !user) return 0;
  const fields = [
    user?.fullName,
    user?.email,
    profile?.profilePhone,
    profile?.profileAddress,
    profile?.profileLinkedin,
    profile?.profileBio,
    profile?.employmentStatus,
    profile?.educationLevel,
  ];
  const filled = fields.filter((f) => f && String(f).trim()).length;
  return Math.round((filled / 8) * 100);
}
