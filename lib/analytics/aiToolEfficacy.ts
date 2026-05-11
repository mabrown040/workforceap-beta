import { prisma } from '@/lib/db/prisma';

/**
 * AI Tool Efficacy Analysis
 * 
 * Questions this answers:
 * 1. Did members who used resume rewriter get more interviews?
 * 2. Did members who used interview practice get placed faster?
 * 3. Which AI tools correlate with placement?
 * 4. What's the completion rate by tool usage?
 * 
 * This is the data feedback loop Mike envisioned — using member data
 * to improve the product and demonstrate value to funders.
 */

interface ToolEfficacyResult {
  toolType: string;
  toolLabel: string;
  usersWithTool: number;
  usersWithoutTool: number;
  avgJobApplicationsWith: number;
  avgJobApplicationsWithout: number;
  placementRateWith: number; // percentage
  placementRateWithout: number; // percentage
  avgDaysToPlacementWith: number | null;
  avgDaysToPlacementWithout: number | null;
  courseCompletionRateWith: number;
  courseCompletionRateWithout: number;
}

const TOOL_LABELS: Record<string, string> = {
  resume_rewriter: 'Resume Rewriter',
  cover_letter: 'Cover Letter',
  interview_practice: 'Interview Practice',
  interview_coach: 'Interview Coach',
  voice_interview_video: 'Voice Interview',
  linkedin_headline: 'LinkedIn Headline',
  linkedin_about: 'LinkedIn About',
  job_match_scorer: 'Job Match Scorer',
  resume_analysis: 'Resume Analysis',
  salary_negotiation: 'Salary Negotiation',
  gap_analyzer: 'Gap Analyzer',
  career_counselor: 'Career Counselor',
  skill_assessment: 'Skill Assessment',
};

export async function analyzeToolEfficacy(): Promise<ToolEfficacyResult[]> {
  const results: ToolEfficacyResult[] = [];

  // Get all tool types that have been used
  const toolTypes = await prisma.aIToolResult.groupBy({
    by: ['toolType'],
    _count: { userId: true },
    orderBy: { _count: { userId: 'desc' } },
  });

  for (const { toolType } of toolTypes) {
    if (!toolType) continue;

    // Users who used this tool (at least once)
    const usersWithTool = await prisma.aIToolResult.findMany({
      where: { toolType },
      select: {
        userId: true,
        user: {
          select: {
            _count: {
              select: {
                jobApplications: true,
                courseProgress: { where: { status: 'completed' } },
              },
            },
            placementRecord: {
              select: {
                placedAt: true,
              },
            },
            enrolledAt: true,
            assessmentCompleted: true,
          },
        },
      },
      distinct: ['userId'],
    });

    // Users who never used this tool (but are active members)
    const usersWithoutTool = await prisma.user.findMany({
      where: {
        deletedAt: null,
        placementRecord: null,
        enrolledProgram: { not: null },
        id: {
          notIn: usersWithTool.map((u) => u.userId),
        },
      },
      select: {
        id: true,
        _count: {
          select: {
            jobApplications: true,
            courseProgress: { where: { status: 'completed' } },
          },
        },
        placementRecord: {
          select: {
            placedAt: true,
          },
        },
        enrolledAt: true,
        assessmentCompleted: true,
      },
    });

    // Calculate metrics
    const withToolJobApps = usersWithTool.map((u) => u.user._count.jobApplications);
    const withoutToolJobApps = usersWithoutTool.map((u) => u._count.jobApplications);

    const withToolPlacements = usersWithTool.filter((u) => u.user.placementRecord).length;
    const withoutToolPlacements = usersWithoutTool.filter((u) => u.placementRecord).length;

    const withToolDaysToPlacement = usersWithTool
      .filter((u) => u.user.placementRecord && u.user.enrolledAt)
      .map((u) => {
        const enrolled = u.user.enrolledAt!.getTime();
        const placed = u.user.placementRecord!.placedAt.getTime();
        return Math.round((placed - enrolled) / (1000 * 60 * 60 * 24));
      });

    const withoutToolDaysToPlacement = usersWithoutTool
      .filter((u) => u.placementRecord && u.enrolledAt)
      .map((u) => {
        const enrolled = u.enrolledAt!.getTime();
        const placed = u.placementRecord!.placedAt.getTime();
        return Math.round((placed - enrolled) / (1000 * 60 * 60 * 24));
      });

    const withToolCourseCompletion = usersWithTool.filter((u) => u.user._count.courseProgress > 0).length;
    const withoutToolCourseCompletion = usersWithoutTool.filter((u) => u._count.courseProgress > 0).length;

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    results.push({
      toolType,
      toolLabel: TOOL_LABELS[toolType] ?? toolType,
      usersWithTool: usersWithTool.length,
      usersWithoutTool: usersWithoutTool.length,
      avgJobApplicationsWith: Math.round(avg(withToolJobApps) * 10) / 10,
      avgJobApplicationsWithout: Math.round(avg(withoutToolJobApps) * 10) / 10,
      placementRateWith: usersWithTool.length > 0 ? Math.round((withToolPlacements / usersWithTool.length) * 100) : 0,
      placementRateWithout: usersWithoutTool.length > 0 ? Math.round((withoutToolPlacements / usersWithoutTool.length) * 100) : 0,
      avgDaysToPlacementWith: withToolDaysToPlacement.length > 0 ? Math.round(avg(withToolDaysToPlacement)) : null,
      avgDaysToPlacementWithout: withoutToolDaysToPlacement.length > 0 ? Math.round(avg(withoutToolDaysToPlacement)) : null,
      courseCompletionRateWith: usersWithTool.length > 0 ? Math.round((withToolCourseCompletion / usersWithTool.length) * 100) : 0,
      courseCompletionRateWithout: usersWithoutTool.length > 0 ? Math.round((withoutToolCourseCompletion / usersWithoutTool.length) * 100) : 0,
    });
  }

  return results;
}

/**
 * Generate a markdown report for stakeholders/funders
 */
export function formatEfficacyReport(results: ToolEfficacyResult[]): string {
  const lines: string[] = [
    '# AI Tool Efficacy Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Executive Summary',
    '',
    'This report compares member outcomes (job applications, placements, course completion)',
    'between members who used AI tools vs. those who did not.',
    '',
    '## Results by Tool',
    '',
  ];

  for (const r of results) {
    lines.push(`### ${r.toolLabel}`);
    lines.push('');
    lines.push(`- **Users with tool:** ${r.usersWithTool} | **Without:** ${r.usersWithoutTool}`);
    lines.push(`- **Avg job applications:** ${r.avgJobApplicationsWith} (with) vs ${r.avgJobApplicationsWithout} (without)`);
    lines.push(`- **Placement rate:** ${r.placementRateWith}% (with) vs ${r.placementRateWithout}% (without)`);
    if (r.avgDaysToPlacementWith && r.avgDaysToPlacementWithout) {
      lines.push(`- **Avg days to placement:** ${r.avgDaysToPlacementWith} (with) vs ${r.avgDaysToPlacementWithout} (without)`);
    }
    lines.push(`- **Course completion:** ${r.courseCompletionRateWith}% (with) vs ${r.courseCompletionRateWithout}% (without)`);
    lines.push('');
  }

  // Find the best performing tool
  const bestTool = results.reduce((best, current) => 
    (current.placementRateWith - current.placementRateWithout) > (best.placementRateWith - best.placementRateWithout) 
      ? current : best,
    results[0]
  );

  if (bestTool) {
    lines.push('## Key Insight');
    lines.push('');
    lines.push(`**${bestTool.toolLabel}** shows the strongest correlation with placement outcomes:`);
    lines.push(`- ${bestTool.placementRateWith}% placement rate for users vs ${bestTool.placementRateWithout}% for non-users`);
    lines.push(`- That's a **${bestTool.placementRateWith - bestTool.placementRateWithout} percentage point improvement**`);
    lines.push('');
  }

  return lines.join('\n');
}

// CLI usage: npx tsx scripts/analyze-ai-tool-efficacy.ts
async function main() {
  const results = await analyzeToolEfficacy();
  console.log(formatEfficacyReport(results));
}

if (require.main === module) {
  main().catch(console.error).finally(() => prisma.$disconnect());
}
