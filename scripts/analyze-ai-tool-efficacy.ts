import { analyzeToolEfficacy, formatEfficacyReport } from '@/lib/analytics/aiToolEfficacy';
import { prisma } from '@/lib/db/prisma';

/**
 * Run AI tool efficacy analysis from CLI
 * Usage: npx tsx scripts/analyze-ai-tool-efficacy.ts
 */
async function main() {
  console.log('Running AI tool efficacy analysis...\n');
  const results = await analyzeToolEfficacy();
  const report = formatEfficacyReport(results);
  console.log(report);

  // Save to file for review
  const fs = await import('fs');
  const path = await import('path');
  const reportPath = path.join(process.cwd(), 'docs', 'ai-tool-efficacy-report.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);
  console.log(`\nReport saved to ${reportPath}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
