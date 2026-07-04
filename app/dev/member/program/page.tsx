import { notFound } from 'next/navigation';
import { MemberProgramKit } from '@/components/portal/kit/pages/member/MemberProgramKit';

/**
 * Storybook-lite showcase — MemberProgramKit (module progress + live session
 * + missions). Preview-only, no auth/DB. See app/dev/dashboard/page.tsx for
 * the pattern.
 */
export const dynamic = 'force-dynamic';

export default function DevMemberProgramPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <MemberProgramKit
      programTitle="AWS Cloud Practitioner Essentials"
      progressPercent={78}
      modulesComplete={7}
      modulesTotal={9}
      estRemaining="4 hrs remaining"
      resumeHref="#"
      modules={[
        { title: 'Cloud Concepts', state: 'done', slug: 'cloud-concepts' },
        { title: 'Security & Compliance', state: 'done', slug: 'security-compliance' },
        { title: 'Shared Responsibility Model', state: 'active', slug: 'shared-responsibility' },
        { title: 'Billing & Pricing', state: 'locked', slug: 'billing-pricing' },
        { title: 'Exam Readiness', state: 'locked', slug: 'exam-readiness' },
      ]}
      liveSessionTitle="AWS Exam Readiness Q&A"
      liveSessionWhen="Thu, Jul 9 · 6:00 PM CT"
      liveSessionStart="2026-07-09T23:00:00.000Z"
      liveSessionDurationMinutes={60}
      missionsSummary="3 missions active · 180 pts up for grabs this week"
      missionsHref="#"
    />
  );
}
