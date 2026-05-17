import { buildCsv } from '@/lib/csv';

/** One aggregated row per enrolled program slug (grant / funder reporting). */
export type FunderProgramSummaryRow = {
  programSlug: string;
  programTitle: string;
  totalEnrolled: number;
  activeLast30d: number;
  completed: number;
  placed: number;
  atRisk: number;
  completionPct: number;
  placementPct: number;
};

export const FUNDER_PROGRAM_SUMMARY_CSV_HEADERS = [
  'Program',
  'Total Enrolled',
  'Active (last 30d)',
  'Completed',
  'Placed',
  'At-Risk',
  'Completion %',
  'Placement %',
] as const;

/** Plain CSV — first row is column headers — for spreadsheets and funder uploads. */
export function buildFunderProgramSummaryCsv(summaryRows: FunderProgramSummaryRow[]): string {
  const dataRows = summaryRows.map((r) => [
    r.programTitle,
    r.totalEnrolled,
    r.activeLast30d,
    r.completed,
    r.placed,
    r.atRisk,
    `${r.completionPct}%`,
    `${r.placementPct}%`,
  ]);

  return buildCsv([...FUNDER_PROGRAM_SUMMARY_CSV_HEADERS], dataRows);
}
