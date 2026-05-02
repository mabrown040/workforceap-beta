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
  completedCourseCount?: number;
  totalCourseCount?: number;
  starterProfileReviewRequired?: boolean;
  starterProfileMissingFields?: string[];
  hasResume: boolean;
  hasCompletedInterviewPractice?: boolean;
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
    if (ctx.starterProfileReviewRequired) {
      const missing = ctx.starterProfileMissingFields?.slice(0, 3) ?? [];
      const missingNote = missing.length > 0 ? ` Missing: ${missing.join(', ')}.` : '';
      out.push({
        id: 'review_starter_profile',
        title: 'Review your starter profile details',
        body: `Before WorkforceAP unlocks your Training Preassessment, confirm the contact and referral details your counselor entered.${missingNote}`,
        href: '/dashboard/profile',
        cta: 'Review profile',
        variant: 'urgent',
        weight: 92,
      });
    } else {
      out.push({
        id: 'skills_assessment',
        title: 'Complete your Training Preassessment',
        body: 'After you choose a program, this short preassessment helps personalize your training plan and identify roles that may be a good fit.',
        href: '/dashboard/assessment',
        cta: 'Start preassessment',
        variant: 'urgent',
        weight: 90,
      });
    }
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

  if (
    ctx.assessmentCompleted &&
    !!ctx.enrolledProgram &&
    (ctx.completedCourseCount ?? 0) === 0 &&
    (ctx.state === 'C' || ctx.state === 'D')
  ) {
    out.push({
      id: 'launch_first_course',
      title: 'Launch your first Coursera course',
      body: 'Start training now so your first certificate, resume work, and job-readiness steps stay in motion together.',
      href: '/dashboard/coursera',
      cta: 'Open Coursera',
      variant: 'urgent',
      weight: 86,
    });

    out.push({
      id: 'see_training_plan',
      title: 'See how training leads to job help',
      body: 'Get the simple step-by-step: preassessment, Coursera training, certificates, AI coaching, and counselor support.',
      href: '/dashboard/guide',
      cta: 'View guide',
      variant: 'default',
      weight: 79,
    });
  }

  if ((ctx.state === 'C' || ctx.state === 'D') && !ctx.hasResume) {
    out.push({
      id: 'upload_resume',
      title: 'Add your resume',
      body: 'Upload a resume so employers and AI tools can tailor help to your background.',
      href: '/dashboard/ai-tools/resume-rewriter',
      cta: 'Try resume rewriter',
      variant: 'default',
      weight: 80,
    });
  }

  if (ctx.state === 'D' && !ctx.hasCompletedInterviewPractice) {
    out.push({
      id: 'interview_practice',
      title: 'Practice your interview answers',
      body: 'Use guided interview practice to prepare for recruiter screens and counselor interviews.',
      href: '/dashboard/ai-tools/interview-practice',
      cta: 'Practice interviews',
      variant: 'default',
      weight: 72,
    });

    out.push({
      id: 'career_readiness',
      title: 'Build your job readiness plan',
      body: 'Review your readiness checklist so applications, interview prep, and counselor guidance stay in sync.',
      href: '/dashboard/readiness',
      cta: 'Open readiness',
      variant: 'default',
      weight: 68,
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
