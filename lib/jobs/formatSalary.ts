/** Human-readable salary for listings and job detail (handles one-sided ranges). */
export function formatJobSalaryRange(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `$${min.toLocaleString()} – $${max.toLocaleString()}/yr`;
  if (min != null) return `From $${min.toLocaleString()}/yr`;
  if (max != null) return `Up to $${max.toLocaleString()}/yr`;
  return null;
}
