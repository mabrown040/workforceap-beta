export const DEFAULT_PRIMARY_BARRIER = {
  value: 'seeking_skills_training',
  label: 'Need to get Occupational or Professional Certificate to increase employability',
} as const;

export const PRIMARY_BARRIER_OPTIONS = [
  { value: 'seeking_skills_training', label: 'Need in-demand occupation or certificate training' },
  { value: 'no_barrier', label: 'No barrier right now' },
  { value: 'employment_gap', label: 'Employment gap' },
  { value: 'limited_work_history', label: 'Limited work history' },
  { value: 'snap_tanf_wic', label: 'SNAP / TANF / Food Stamps / WIC' },
  { value: 'justice_involved', label: 'Background / justice involvement' },
  { value: 'disability_health', label: 'Disability or health barrier' },
  { value: 'housing_instable', label: 'Housing instability' },
  { value: 'other_barrier', label: 'Other barrier' },
] as const;

/**
 * The subset shown to a high-school-partner applicant (Phase B4 hardening).
 *
 * The full list asks about SNAP/TANF receipt, justice involvement, disability
 * and housing instability. Those answers go to `Profile.barrierTypes`, to
 * `Application.notes` — which the member's own GDPR export returns verbatim —
 * and to the admin alert email. Putting them to a 15-year-old on a school
 * computer, unprompted and with no adult present, collects sensitive family
 * circumstances we have no immediate use for; B4 removed the two income
 * questions for exactly this reason and then left these in.
 *
 * Kept rather than dropped entirely so the block still does its job:
 * `hasEmploymentBarrier` and `barrierTypes` stay populated, "other barrier"
 * still routes a student to supportive services, and step 1 keeps the same
 * shape across variants. A counselor collects the rest in person.
 *
 * Every value here is also in `PRIMARY_BARRIER_OPTIONS`, so nothing downstream
 * sees a value it does not already know.
 */
export const SCHOOL_PRIMARY_BARRIER_OPTIONS = PRIMARY_BARRIER_OPTIONS.filter((option) =>
  (['seeking_skills_training', 'no_barrier', 'other_barrier'] as const).some(
    (value) => value === option.value
  )
);

export function normalizePrimaryBarriers(values: string[] | null | undefined): string[] {
  const unique = new Set<string>([DEFAULT_PRIMARY_BARRIER.value]);
  for (const value of values ?? []) {
    const trimmed = value.trim();
    if (!trimmed || trimmed === 'none') continue;
    unique.add(trimmed);
  }
  return [...unique];
}
