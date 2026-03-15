import { prisma } from '@/lib/db/prisma';
import type { AIToolType } from '@prisma/client';

export async function saveAIToolResult(
  userId: string,
  toolType: AIToolType,
  inputSummary: string,
  output: string
) {
  await prisma.aIToolResult.create({
    data: {
      userId,
      toolType,
      inputSummary,
      output,
    },
  });
}
