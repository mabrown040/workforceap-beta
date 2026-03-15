import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

const TOOL_LABELS: Record<string, string> = {
  resume_rewriter: 'Resume Rewriter',
  cover_letter: 'Cover Letter',
  interview_practice: 'Interview Practice',
  linkedin_headline: 'LinkedIn Headline',
};

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const toolType = searchParams.get('tool');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

  const results = await prisma.aIToolResult.findMany({
    where: {
      userId: user.id,
      ...(toolType && toolType in TOOL_LABELS ? { toolType: toolType as 'resume_rewriter' | 'cover_letter' | 'interview_practice' | 'linkedin_headline' } : {}),
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
    results: results.map((r) => ({
      id: r.id,
      toolType: r.toolType,
      toolLabel: TOOL_LABELS[r.toolType] ?? r.toolType,
      inputSummary: r.inputSummary,
      output: r.output,
      createdAt: r.createdAt,
    })),
  });
}
