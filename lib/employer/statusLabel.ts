/**
 * Title-cases a lowercase / snake_case status token for display
 * (`live` -> `Live`, `under_review` -> `Under Review`). Shared by the employer
 * work queue, mobile applications list, and outcomes dashboard so raw enum
 * values never reach the screen.
 */
export function statusLabel(status: string): string {
  return status
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
