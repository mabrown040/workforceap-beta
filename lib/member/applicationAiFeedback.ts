import type { AIToolType, PrismaClient } from '@prisma/client';

/** Tool runs we ask about when a member logs a new job application. */
export const APPLICATION_FEEDBACK_TOOL_TYPES: AIToolType[] = [
  'resume_rewriter',
  'resume_analysis',
  'interview_practice',
  'interview_coach',
];

export type RecentAiToolForFeedback = {
  id: string;
  toolType: AIToolType;
  createdAt: Date;
  label: string;
};

const TOOL_LABEL: Partial<Record<AIToolType, string>> = {
  resume_rewriter: 'Resume & Experience enhancer',
  resume_analysis: 'Resume analysis',
  interview_practice: 'Interview practice',
  interview_coach: 'Interview coach',
};

export async function findRecentAiToolsForApplicationFeedback(
  prisma: PrismaClient,
  userId: string,
  withinDays = 30,
): Promise<RecentAiToolForFeedback[]> {
  const since = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);
  const rows = await prisma.aIToolResult.findMany({
    where: {
      userId,
      toolType: { in: [...APPLICATION_FEEDBACK_TOOL_TYPES] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: { id: true, toolType: true, createdAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    toolType: r.toolType,
    createdAt: r.createdAt,
    label: TOOL_LABEL[r.toolType] ?? r.toolType,
  }));
}

export function formatFeedbackPromptDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
