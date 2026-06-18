import { NextResponse } from 'next/server';
import type { AIToolType } from '@prisma/client';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const TOOL_LABELS: Record<string, string> = {
  job_match_scorer: 'See how you match a job',
  resume_analysis: 'Resume Analysis',
  resume_rewriter: 'Resume Rewriter',
  cover_letter: 'Cover Letter',
  interview_practice: 'Interview Practice',
  interview_coach: 'Interview Coach',
  voice_interview_video: 'Mock Interview Video',
  linkedin_headline: 'LinkedIn Headline',
  linkedin_about: 'LinkedIn About',
  salary_negotiation: 'Salary Negotiation',
  gap_analyzer: 'See what is missing for a job',
  career_counselor: 'Career Coach',
  skill_assessment: 'Find skills employers want / Skill Assessment',
};export const GET = withApiGuc(async (request: Request) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
  const { searchParams } = new URL(request.url);
  const toolType = searchParams.get('tool');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 100);

  const results = await prisma.$transaction((tx) => tx.aIToolResult.findMany({
    where: {
      userId: user.id,
      ...(toolType && toolType in TOOL_LABELS ? { toolType: toolType as AIToolType } : {}),
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
  }));

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
  } catch {
    return NextResponse.json({ error: 'Failed to load AI history' }, { status: 500 });
  }

  } catch (error) {
    console.error('/member/ai-history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

