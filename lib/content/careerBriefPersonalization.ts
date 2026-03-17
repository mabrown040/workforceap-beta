import { prisma } from '@/lib/db/prisma';
import { getScoreBreakdown } from '@/lib/readiness/score';

export type CareerBriefContext = {
  location: string | null;
  programInterest: string | null;
  programShortLabel: string | null;
  applicationsCount: number;
  toolsUsed: string[];
  recommendedActions: Array< { label: string; href: string }>;
  jobSearchUrl: string | null;
};

/** Map program interest to a short label for display */
function getProgramShortLabel(programInterest: string | null): string | null {
  if (!programInterest) return null;
  if (programInterest.includes('IT Support') || programInterest.includes('CompTIA') || programInterest.includes('Cybersecurity') || programInterest.includes('AWS') || programInterest.includes('IBM')) {
    return 'IT & Tech';
  }
  if (programInterest.includes('Medical') || programInterest.includes('Health')) {
    return 'Healthcare';
  }
  if (programInterest.includes('Construction') || programInterest.includes('Logistics') || programInterest.includes('CPT') || programInterest.includes('CLT')) {
    return 'Trades & Logistics';
  }
  if (programInterest.includes('Data') || programInterest.includes('UX') || programInterest.includes('Digital Marketing') || programInterest.includes('Project Management')) {
    return 'Data & Design';
  }
  return programInterest.length > 30 ? programInterest.slice(0, 30) + '…' : programInterest;
}

/** Build Indeed job search URL for location + role */
function buildJobSearchUrl(programShortLabel: string | null, city: string | null, state: string | null): string | null {
  const loc = [city, state].filter(Boolean).join(', ');
  if (!loc.trim()) return null;
  const query = programShortLabel?.replace(/&/g, ' ') ?? 'jobs';
  const params = new URLSearchParams({
    q: query,
    l: loc,
  });
  return `https://www.indeed.com/jobs?${params.toString()}`;
}

export async function getCareerBriefContext(userId: string): Promise<CareerBriefContext> {
  const [dbUser, scoreBreakdown] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        applications: { orderBy: { createdAt: 'desc' }, take: 1 },
        jobApplications: true,
        aiToolResults: { select: { toolType: true } },
      },
    }),
    getScoreBreakdown(userId),
  ]);

  const profile = dbUser?.profile;
  const application = dbUser?.applications?.[0];
  const programInterest = application?.programInterest ?? null;
  const programShortLabel = getProgramShortLabel(programInterest);
  const city = profile?.city?.trim() || null;
  const state = profile?.state?.trim() || null;
  const location = [city, state].filter(Boolean).join(', ') || null;

  const applicationsCount =
    dbUser?.jobApplications?.filter((a) => a.status !== 'SAVED').length ?? 0;
  const toolsUsed = [...new Set((dbUser?.aiToolResults ?? []).map((r) => r.toolType))];

  const recommendedActions: Array<{ label: string; href: string }> = [];

  if (!scoreBreakdown.buildResume.done) {
    recommendedActions.push({ label: 'Build your resume', href: '/ai-tools/resume-rewriter' });
  }
  if (!scoreBreakdown.practiceInterview.done) {
    recommendedActions.push({ label: 'Practice interview questions', href: '/ai-tools/interview-practice' });
  }
  if (applicationsCount === 0) {
    recommendedActions.push({ label: 'Log your first application', href: '/ai-tools/application-tracker' });
  }
  if (!scoreBreakdown.complete2Resources.done) {
    recommendedActions.push({ label: 'Complete 2 resources', href: '/resources' });
  }
  if (!scoreBreakdown.setGoals.done) {
    recommendedActions.push({ label: 'Set your goals', href: '/dashboard' });
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push({ label: 'Add another application', href: '/ai-tools/application-tracker' });
  }

  const jobSearchUrl = buildJobSearchUrl(programShortLabel, city, state);

  return {
    location,
    programInterest,
    programShortLabel,
    applicationsCount,
    toolsUsed,
    recommendedActions: recommendedActions.slice(0, 3),
    jobSearchUrl,
  };
}
