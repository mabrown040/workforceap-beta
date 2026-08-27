import { notFound } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { PROGRAMS } from '@/lib/content/programs';
import ProgramPicker from '@/components/portal/ProgramPicker';
import { DesignSurface, PageOpener } from '@/components/portal/kit';
import { MemberProgramKit } from '@/components/portal/kit/pages/member/MemberProgramKit';

/**
 * Storybook-lite showcase — MemberProgramKit (module progress + live session
 * + missions). Preview-only, no auth/DB. See app/dev/dashboard/page.tsx for
 * the pattern.
 *   /dev/member/program            — enrolled path
 *   /dev/member/program?state=empty — choose-your-program picker (preview)
 */
export const dynamic = 'force-dynamic';

const PREVIEW_PROGRAMS = ['it-cyber', 'ai-software', 'healthcare']
  .map((category) => PROGRAMS.find((p) => p.category === category))
  .filter((p): p is (typeof PROGRAMS)[number] => Boolean(p));

export default async function DevMemberProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  if (state === 'empty') {
    return (
      <DesignSurface surface="warm">
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--wa-pad-sm)' }} className="wa-space-y-6">
          <PageOpener
            kicker="Program"
            title="Choose your program"
            lede="Funding covers one program at a time. Your counselor can help you switch later."
            icon={<GraduationCap size={13} aria-hidden="true" />}
          />
          <ProgramPicker programs={PREVIEW_PROGRAMS} preview />
        </div>
      </DesignSurface>
    );
  }

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
      missionsSummary="3 missions ready on this path."
      missionsHref="#"
    />
  );
}
