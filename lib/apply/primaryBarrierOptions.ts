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

export function normalizePrimaryBarriers(values: string[] | null | undefined): string[] {
  const unique = new Set<string>([DEFAULT_PRIMARY_BARRIER.value]);
  for (const value of values ?? []) {
    const trimmed = value.trim();
    if (!trimmed || trimmed === 'none') continue;
    unique.add(trimmed);
  }
  return [...unique];
}
