import { notFound } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { PROGRAMS } from '@/lib/content/programs';
import ProgramPicker from '@/components/portal/ProgramPicker';
import { DesignSurface, PageOpener } from '@/components/portal/kit';
import { MemberProgramKit } from '@/components/portal/kit/pages/member/MemberProgramKit';
import { MemberTrainingWorkspace } from '@/components/portal/kit/pages/member/MemberTrainingWorkspace';
import type { TrainingWorkspace } from '@/lib/member/trainingWorkspace';

/**
 * Storybook-lite showcase — MemberProgramKit (module progress + live session
 * + missions). Preview-only, no auth/DB. See app/dev/dashboard/page.tsx for
 * the pattern.
 *   /dev/member/program            — enrolled path
 *   /dev/member/program?state=empty — choose-your-program picker (preview)
 *   /dev/member/program?state=workspace — training overview + Continue this course
 *   /dev/member/program?state=digital-literacy — WorkforceAP Continue as a filled CTA
 */
export const dynamic = 'force-dynamic';

const PREVIEW_PROGRAMS = ['it-cyber', 'ai-software', 'healthcare']
  .map((category) => PROGRAMS.find((p) => p.category === category))
  .filter((p): p is (typeof PROGRAMS)[number] => Boolean(p));

const PREVIEW_WORKSPACE: TrainingWorkspace = {
  programSlug: 'aws-cloud-practitioner',
  programTitle: 'AWS Certified Cloud Practitioner Certificate',
  curriculumVersion: 'preview-v1',
  weeklyHours: 10,
  planStartDate: '2026-09-01',
  planUpdatedAt: '2026-09-01T12:00:00.000Z',
  totalEstimatedHours: 12,
  publishedSyllabusHours: 12,
  courses: [
    {
      slug: 'cloud-concepts',
      name: 'Cloud Concepts',
      estimatedHours: 4,
      description: 'Start with the shared-responsibility model and core AWS services.',
      kind: 'coursera',
      notes: '',
      artifactUrl: null,
      updatedAt: null,
    },
    {
      slug: 'shared-responsibility',
      name: 'Shared Responsibility Model',
      estimatedHours: 8,
      description: 'Apply the model to a sample workload.',
      kind: 'workforceap',
      notes: '',
      artifactUrl: null,
      updatedAt: null,
    },
  ],
};

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

  if (state === 'workspace') {
    return (
      <MemberTrainingWorkspace
        workspace={PREVIEW_WORKSPACE}
        programTitle={PREVIEW_WORKSPACE.programTitle}
        completedSlugs={[]}
        destinations={[
          { slug: 'cloud-concepts', moduleHref: '/dev/member/program' },
          { slug: 'shared-responsibility', moduleHref: '/dev/member/program' },
        ]}
        initialCourseSlug="cloud-concepts"
        syllabusHours={12}
        syllabusBreakdown="12 assigned hours across two courses."
      />
    );
  }

  if (state === 'digital-literacy') {
    return (
      <MemberProgramKit
        programTitle="Workforce AP Digital Literacy Course"
        progressPercent={0}
        modulesComplete={0}
        modulesTotal={3}
        estRemaining="4 hrs remaining"
        resumeHref="/dev/member/digital-literacy-module"
        modules={[
          {
            title: 'Computer Basics',
            state: 'active',
            slug: 'computer-basics',
            kind: 'workforceap',
            moduleHref: '/dev/member/digital-literacy-module',
          },
          { title: 'File Management Basics', state: 'locked', slug: 'file-management-basics' },
          { title: 'Internet Basics', state: 'locked', slug: 'internet-basics' },
        ]}
        missionsSummary="No missions assigned."
        missionsHref="#"
      />
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
