/**
 * Generate quarterly outcomes report for grants
 *
 * Usage:
 *   npx tsx scripts/generate-quarterly-outcomes.ts [--quarter=Q1|Q2|Q3|Q4] [--year=YYYY]
 *
 * Defaults to the previous completed quarter if none specified.
 */

import { prisma } from '@/lib/db/prisma';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import {
  generateQuarterlyOutcomes,
  getDefaultQuarter,
  formatQuarterlyReportMarkdown,
  quarterlyOutcomesToCsvSummary,
  quarterlyOutcomesToCsvPrograms,
  quarterlyOutcomesToCsvPlacements,
  rowsToCsv,
  type QuarterSpec,
} from '@/lib/analytics/quarterlyOutcomes';

function parseArgs(argv: string[]): QuarterSpec {
  const quarterArg = argv.find((a) => a.startsWith('--quarter='));
  const yearArg = argv.find((a) => a.startsWith('--year='));

  if (quarterArg || yearArg) {
    const quarter = (quarterArg?.split('=')[1] ?? getDefaultQuarter().quarter) as QuarterSpec['quarter'];
    const year = yearArg ? parseInt(yearArg.split('=')[1], 10) : getDefaultQuarter().year;
    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      throw new Error(`Invalid quarter: ${quarter}. Must be Q1, Q2, Q3, or Q4.`);
    }
    if (Number.isNaN(year) || year < 2020 || year > 2100) {
      throw new Error(`Invalid year: ${yearArg?.split('=')[1]}. Must be a reasonable year.`);
    }
    return { quarter, year };
  }

  return getDefaultQuarter();
}

async function main() {
  const spec = parseArgs(process.argv.slice(2));
  const orgId = await getDefaultOrganizationId();

  console.log(`Generating quarterly outcomes report for ${spec.quarter} ${spec.year}...\n`);

  const report = await generateQuarterlyOutcomes(orgId, spec);

  // JSON to stdout
  console.log(JSON.stringify(report, null, 2));

  // Markdown report
  const fs = await import('fs');
  const path = await import('path');

  const docsDir = path.join(process.cwd(), 'docs', 'outcomes');
  fs.mkdirSync(docsDir, { recursive: true });

  const mdPath = path.join(docsDir, `${spec.year}-${spec.quarter}-report.md`);
  const md = formatQuarterlyReportMarkdown(report);
  fs.writeFileSync(mdPath, md);
  console.log(`\nMarkdown report saved to ${mdPath}`);

  // CSV files
  const summaryCsv = rowsToCsv(quarterlyOutcomesToCsvSummary(report));
  const summaryPath = path.join(docsDir, `${spec.year}-${spec.quarter}-summary.csv`);
  fs.writeFileSync(summaryPath, summaryCsv);
  console.log(`Summary CSV saved to ${summaryPath}`);

  const programsCsv = rowsToCsv(quarterlyOutcomesToCsvPrograms(report));
  const programsPath = path.join(docsDir, `${spec.year}-${spec.quarter}-programs.csv`);
  fs.writeFileSync(programsPath, programsCsv);
  console.log(`Programs CSV saved to ${programsPath}`);

  const placementsCsv = rowsToCsv(quarterlyOutcomesToCsvPlacements(report));
  const placementsPath = path.join(docsDir, `${spec.year}-${spec.quarter}-placements.csv`);
  fs.writeFileSync(placementsPath, placementsCsv);
  console.log(`Placements CSV saved to ${placementsPath}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
