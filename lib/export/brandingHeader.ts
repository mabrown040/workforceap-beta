/**
 * Shared export branding helpers — adds WorkforceAP identity to all
 * CSV and PDF downloads so every file carries our logo/name.
 */

/** Prepend a branded comment header to a CSV string */
export function withCsvBranding(csvContent: string, reportTitle: string, notes?: string): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const header = [
    `# Workforce Advancement Project — ${reportTitle}`,
    `# workforceap.org | Generated: ${date}`,
    notes ? `# ${notes}` : null,
    '#',
  ]
    .filter(Boolean)
    .join('\n');
  return `${header}\n${csvContent}`;
}

/** Build a text footer row for CSV (appended after data rows) */
export function csvBrandingFooter(): string {
  return `\n# Workforce Advancement Project — workforceap.org`;
}
