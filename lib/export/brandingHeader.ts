/**
 * Shared export branding helpers — adds WorkforceAP identity to all
 * CSV and PDF downloads so every file carries our logo/name.
 */

/** Build the standard CSV comment header (CRLF line endings, RFC 4180-friendly). */
export function buildCsvBrandingLines(reportTitle: string, notes?: string): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const lines = [
    `# Workforce Advancement Project — ${reportTitle}`,
    `# workforceap.org | Generated: ${date}`,
    notes ? `# ${notes}` : null,
    '#',
  ]
    .filter(Boolean) as string[];
  return lines.join('\r\n');
}

/** Prepend a branded comment header to a CSV string */
export function withCsvBranding(csvContent: string, reportTitle: string, notes?: string): string {
  return `${buildCsvBrandingLines(reportTitle, notes)}\r\n${csvContent}`;
}
