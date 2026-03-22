import { NextResponse } from 'next/server';
import type { AIToolType } from '@prisma/client';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { TOOL_METADATA_BY_TYPE } from '@/lib/ai/toolMeta';

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const toolType = searchParams.get('tool');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

  const results = await prisma.aIToolResult.findMany({
    where: {
      userId: user.id,
      ...(toolType && toolType in TOOL_METADATA_BY_TYPE ? { toolType: toolType as AIToolType } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      toolType: true,
      inputSummary: true,
      output: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    results: results.map((result) => {
      const meta = TOOL_METADATA_BY_TYPE[result.toolType];
      return {
        id: result.id,
        toolType: result.toolType,
        toolLabel: meta?.title ?? result.toolType,
        toolHref: meta?.href ?? '/dashboard/ai-tools',
        job: meta?.job ?? null,
        inputSummary: result.inputSummary,
        output: result.output,
        createdAt: result.createdAt,
      };
    }),
  });
}
