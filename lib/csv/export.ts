/**
 * High-level CSV export helpers for admin data tables.
 *
 * Wraps the low-level primitives in lib/csv.ts with typed column definitions
 * and standardised download-response creation.
 */

import { NextResponse } from 'next/server';
import { buildCsv, csvDate } from '../csv';

export type CsvValue = string | number | boolean | Date | null | undefined;

export interface CsvColumn<T> {
  key: string;
  header: string;
  /** Return the raw value; it will be stringified and escaped automatically. */
  accessor: (row: T) => CsvValue;
}

/** Convert an array of objects to a CSV string using column definitions. */
export function dataToCsv<T>(
  columns: CsvColumn<T>[],
  rows: T[],
  options?: { reportTitle?: string; notes?: string },
): string {
  const headers = columns.map((c) => c.header);
  const dataRows = rows.map((row) =>
    columns.map((c) => {
      const val = c.accessor(row);
      if (val instanceof Date) return csvDate(val);
      if (typeof val === 'boolean') return val ? 'Yes' : 'No';
      return val ?? '';
    }),
  );
  return buildCsv(headers, dataRows, options);
}

/** Build a NextResponse that triggers a browser CSV download. */
export function csvDownloadResponse(
  csvContent: string,
  filename: string,
  options?: { truncated?: boolean; limit?: number },
): NextResponse {
  const headers: Record<string, string> = {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  };
  if (options?.truncated) {
    headers['X-Export-Truncated'] = 'true';
    headers['X-Export-Limit'] = String(options.limit);
  }
  return new NextResponse(csvContent, { status: 200, headers });
}

/** Format a filename like `members-2026-05-13.csv`. */
export function exportFilename(base: string, ext = 'csv'): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${base}-${date}.${ext}`;
}
