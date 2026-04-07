/**
 * Shared CSV utilities — used by admin, partner, and member export routes.
 */

/** Escape a value for CSV: wrap in quotes if it contains special chars. */
export function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Turn a row of values into a CSV line. */
export function csvRow(values: (string | number | null | undefined)[]): string {
  return values.map((v) => csvEscape(String(v ?? ''))).join(',');
}

/** Build a complete CSV string from headers + data rows. */
export function buildCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const lines = [csvRow(headers), ...rows.map(csvRow)];
  return `${lines.join('\r\n')}\r\n`;
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
