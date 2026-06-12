import { prisma } from '@/lib/db/prisma';
import { AIToolType } from '@prisma/client';

export type PrepBundleItem = {
  toolType: AIToolType;
  title: string;
  content: string;
  createdAt: Date;
};

export type InterviewPrepBundle = {
  items: PrepBundleItem[];
  generatedAt: Date;
  empty: boolean;
};

const BUNDLE_TOOL_TYPES: AIToolType[] = [
  'resume_rewriter',
  'cover_letter',
  'interview_practice',
  'interview_coach',
  'salary_negotiation',
  'job_match_scorer',
  'resume_analysis',
  'voice_interview_video',
  'career_counselor',
  'linkedin_headline',
  'linkedin_about',
];

const TOOL_LABELS: Record<AIToolType, string> = {
  resume_rewriter: 'Resume',
  cover_letter: 'Cover Letter',
  interview_practice: 'Interview Practice Q&A',
  interview_coach: 'Interview Coaching Feedback',
  salary_negotiation: 'Salary Negotiation Script',
  job_match_scorer: 'Job Match Analysis',
  resume_analysis: 'Resume Strength Analysis',
  voice_interview_video: 'Voice Interview Feedback',
  career_counselor: 'Career Coaching & Elevator Pitch',
  linkedin_headline: 'LinkedIn Headline',
  linkedin_about: 'LinkedIn About',
  skill_assessment: 'Skills Assessment',
  gap_analyzer: 'Gap Analysis',
  skill_mission: 'Skill Mission Proof',
  job_tailor: 'Job-Tailored Resume',
};

/**
 * Fetch the latest AIToolResult for each relevant tool type.
 * If career_counselor results contain "elevator", surface those first.
 */
export async function fetchInterviewPrepBundle(userId: string): Promise<InterviewPrepBundle> {
  const results = await prisma.aIToolResult.findMany({
    take: 500,
    where: {
      userId,
      toolType: { in: BUNDLE_TOOL_TYPES },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Keep only the latest result per tool type
  const latestByType = new Map<string, typeof results[0]>();
  for (const r of results) {
    if (!latestByType.has(r.toolType)) {
      latestByType.set(r.toolType, r);
    }
  }

  const items: PrepBundleItem[] = [];
  for (const [toolType, record] of latestByType) {
    items.push({
      toolType: toolType as AIToolType,
      title: TOOL_LABELS[toolType as AIToolType] || toolType,
      content: record.output,
      createdAt: record.createdAt,
    });
  }

  // Sort: career/elevator first, then resume/cover letter, then interview prep, then rest
  const priorityOrder = [
    'career_counselor',
    'resume_rewriter',
    'cover_letter',
    'linkedin_headline',
    'linkedin_about',
    'job_match_scorer',
    'interview_practice',
    'interview_coach',
    'voice_interview_video',
    'salary_negotiation',
    'resume_analysis',
  ];
  items.sort((a, b) => {
    const ai = priorityOrder.indexOf(a.toolType);
    const bi = priorityOrder.indexOf(b.toolType);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return {
    items,
    generatedAt: new Date(),
    empty: items.length === 0,
  };
}
