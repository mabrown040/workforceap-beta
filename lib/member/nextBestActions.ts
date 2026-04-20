/**
 * Prioritized “next best actions” for the member dashboard.
 * Pure function — easy to unit test and tune without DB calls.
 */

export type NextBestAction = {
  id: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  variant: 'urgent' | 'default';
  /** Higher sorts first */
  weight: number;
};

export type NextBestActionsContext = {
  state: 'A' | 'B' | 'C' | 'D';
  noApplicationOnFile: boolean;
  enrolledProgram: string | null;
  assessmentCompleted: boolean;
  hasResume: boolean;
  profileCompletenessPct: number;
  profileMissingFields?: string[];
  jobApplicationCount: number;
  counselorUnreadCount: number;
  weeklyRecapUnopened: boolean;
};

export function buildNextBestActions(ctx: NextBestActionsContext): NextBestAction[] {
  const out: NextBestAction[] = [];

  if (ctx.noApplicationOnFile) {
    out.push({
      id: 'submit_application',
      title: 'Submit a program application',
      body: "Takes about 10 minutes — we'll match you to a funded program and connect you with a counselor.",
      href: '/apply',
      cta: 'Start application',
      variant: 'urgent',
      weight: 100,
    });
  }

  if (ctx.state === 'A' && !ctx.noApplicationOnFile && !ctx.enrolledProgram) {
    out.push({
      id: 'choose_program',
      title: 'Choose your program',
      body: 'Enrollment is tied to one funded program. Pick the track that fits your goals.',
      href: '/dashboard/program',
      cta: 'Choose program',
      variant: 'urgent',
      weight: 95,
    });
  }

  if (ctx.state === 'B') {
    out.push({
      id: 'skills_assessment',
      title: 'Complete your skills assessment',
      body: 'Start your training path and job matching with a short assessment.',
      href: '/dashboard/assessment',
      cta: 'Take assessment',
      variant: 'urgent',
      weight: 90,
    });
  }

  if (ctx.counselorUnreadCount > 0) {
    out.push({
      id: 'counselor_messages',
      title: 'Message from your team',
      body:
        ctx.counselorUnreadCount === 1
          ? 'You have an unread message from your counselor or program team.'
          : `You have ${ctx.counselorUnreadCount} unread messages from your counselor or program team.`,
      href: '/dashboard/messages',
      cta: 'Open messages',
      variant: 'urgent',
      weight: 88,
    });
  }

  if ((ctx.state === 'C' || ctx.state === 'D') && !ctx.hasResume) {
    out.push({
      id: 'upload_resume',
      title: 'Add your resume',
      body: 'Upload a resume so employers and AI tools can tailor help to your background.',
      href: '/dashboard/resume',
      cta: 'Upload resume',
      variant: 'default',
      weight: 80,
    });
  }

  if (
    ctx.assessmentCompleted &&
    !!ctx.enrolledProgram &&
    ctx.jobApplicationCount === 0 &&
    (ctx.state === 'C' || ctx.state === 'D')
  ) {
    out.push({
      id: 'job_tracker',
      title: 'Track your first application',
      body: 'Save roles from our job board or add outside applications to keep momentum visible.',
      href: '/dashboard/job-applications',
      cta: 'Open tracker',
      variant: 'default',
      weight: 60,
    });
  }

  if (ctx.profileCompletenessPct < 55 && ctx.enrolledProgram) {
    const missing = ctx.profileMissingFields?.slice(0, 3) ?? [];
    const missingNote = missing.length > 0 ? ` Missing: ${missing.join(', ')}.` : '';
    out.push({
      id: 'complete_profile',
      title: 'Strengthen your profile',
      body: `Profile ${ctx.profileCompletenessPct}% complete — employers and AI tools use this data.${missingNote}`,
      href: '/dashboard/profile',
      cta: 'Complete profile',
      variant: 'default',
      weight: 45,
    });
  }

  if (ctx.weeklyRecapUnopened) {
    out.push({
      id: 'weekly_recap',
      title: 'Your weekly recap is ready',
      body: 'See what you accomplished this week and suggested focus areas.',
      href: '/dashboard/weekly-recap',
      cta: 'View recap',
      variant: 'default',
      weight: 40,
    });
  }

  out.sort((a, b) => b.weight - a.weight);

  const seen = new Set<string>();
  const deduped: NextBestAction[] = [];
  for (const a of out) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    deduped.push(a);
  }

  return deduped.slice(0, 4);
}
