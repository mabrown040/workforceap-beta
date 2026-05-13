import { analyzeAIEfficacy, formatEfficacyReportMarkdown } from '@/lib/analytics/aiToolEfficacy';
import { prisma } from '@/lib/db/prisma';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';

/**
 * Run AI tool efficacy analysis from CLI
 * Usage: npx tsx scripts/analyze-ai-tool-efficacy.ts [--days=90]
 */
async function main() {
  const args = process.argv.slice(2);
  const daysArg = args.find((a) => a.startsWith('--days='));
  const days = daysArg ? parseInt(daysArg.split('=')[1], 10) : 90;

  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const orgId = await getDefaultOrganizationId();

  console.log(`Running AI tool efficacy analysis for last ${days} days...\n`);

  const report = await analyzeAIEfficacy(orgId, { start, end });
  const markdown = formatEfficacyReportMarkdown(report);
  console.log(markdown);

  // Save to file for review
  const fs = await import('fs');
  const path = await import('path');
  const reportPath = path.join(process.cwd(), 'docs', 'ai-tool-efficacy-report.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, markdown);
  console.log(`\nReport saved to ${reportPath}`);

  // Also save JSON
  const jsonPath = path.join(process.cwd(), 'docs', 'ai-tool-efficacy-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`JSON saved to ${jsonPath}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
