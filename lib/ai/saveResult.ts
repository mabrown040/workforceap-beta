import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
import type { AIToolType } from '@prisma/client';

export async function saveAIToolResult(
  userId: string,
  toolType: AIToolType,
  inputSummary: string,
  output: string
) {
  const result = await prisma.aIToolResult.create({
    data: {
      userId,
      toolType,
      inputSummary,
      output,
    },
  });
  trackEvent({
    userId,
    eventName: 'ai_tool_submitted',
    entityType: 'ai_tool_result',
    entityId: result.id,
    metadata: { toolType },
  }).catch(() => {});
}
