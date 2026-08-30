import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BookOpen, BriefcaseBusiness, MessageCircle, Mic2 } from 'lucide-react';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { programSlugReadCandidates, programSlugsEquivalent } from '@/lib/content/programSlug';
import { resolveWorkforceApModule } from '@/lib/content/workforceApModule';
import { DesignSurface, PageOpener, StatusTag } from '@/components/portal/kit';
import WorkforceApModuleCompleteButton from '@/components/portal/WorkforceApModuleCompleteButton';

export const metadata: Metadata = {
  title: 'WorkforceAP Lab',
  description: 'Complete an approved WorkforceAP applied-learning lab.',
};

type Props = {
  params: Promise<{ courseSlug: string }>;
  searchParams: Promise<{ program?: string }>;
};

const LAB_ACTIONS = [
  {
    href: '/dashboard/missions',
    title: 'Build an applied artifact',
    detail: 'Use Skill Missions to turn the work into evidence you can show.',
    icon: BookOpen,
  },
  {
    href: '/dashboard/resume',
    title: 'Add the work to your resume',
    detail: 'Translate the project into an outcome-focused resume bullet.',
    icon: BriefcaseBusiness,
  },
  {
    href: '/dashboard/ai-tools/interview-prep',
    title: 'Practice explaining your work',
    detail: 'Prepare a concise interview story about what you built and learned.',
    icon: Mic2,
  },
  {
    href: '/dashboard/messages',
    title: 'Ask for feedback',
    detail: 'Send your counselor the artifact or question before you finish.',
    icon: MessageCircle,
  },
] as const;

export default async function WorkforceApModulePage({ params, searchParams }: Props) {
  const user = await getUser();
  const { courseSlug } = await params;
  const { program: requestedProgram = '' } = await searchParams;
  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/dashboard/learning/modules/${courseSlug}?program=${requestedProgram}`)}`);
  }
  if (!courseSlug || !requestedProgram) notFound();

  const enrollments = await prisma.courseEnrollment.findMany({
    where: {
      userId: user.id,
      programSlug: { in: programSlugReadCandidates(requestedProgram) },
    },
    select: {
      programSlug: true,
      curriculumVersion: true,
      isPrimary: true,
    },
  });
  const enrollment = enrollments.find((row) => row.programSlug === requestedProgram)
    ?? enrollments.find((row) => row.isPrimary)
    ?? enrollments.find((row) => programSlugsEquivalent(row.programSlug, requestedProgram));
  if (!enrollment) notFound();

  const course = resolveWorkforceApModule({
    programSlug: enrollment.programSlug,
    curriculumVersion: enrollment.curriculumVersion,
    courseSlug,
  });
  if (!course) notFound();

  const completion = await prisma.courseProgress.findFirst({
    where: {
      userId: user.id,
      programSlug: { in: programSlugReadCandidates(enrollment.programSlug) },
      courseSlug,
      status: 'COMPLETED',
    },
    select: { id: true },
  });

  return (
    <DesignSurface surface="warm">
      <main style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--wa-pad-sm)', paddingBottom: '5rem' }}>
        <PageOpener
          kicker="WorkforceAP applied lab"
          title={course.name}
          lede={course.description}
          icon={<BookOpen size={14} aria-hidden="true" />}
          action={<StatusTag tone={completion ? 'ok' : 'warn'}>{completion ? 'Complete' : `${course.estimatedHours} hours`}</StatusTag>}
        />

        <section className="wa-kit-card" style={{ marginTop: 24, padding: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Complete the applied work</h2>
          <p style={{ margin: '8px 0 20px', color: 'var(--wa-muted)', lineHeight: 1.6 }}>
            Work through these portal tools, keep your project evidence, and mark the lab complete when your required work is finished.
          </p>
          <div style={{ display: 'grid', gap: 12 }}>
            {LAB_ACTIONS.map(({ href, title, detail, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="portal-card portal-card--flat"
                style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start', textDecoration: 'none' }}
              >
                <Icon size={20} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--color-accent)' }} />
                <span>
                  <strong style={{ display: 'block', color: 'var(--wa-text)' }}>{title}</strong>
                  <span style={{ display: 'block', marginTop: 3, color: 'var(--wa-muted)', lineHeight: 1.45 }}>{detail}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <WorkforceApModuleCompleteButton
            courseSlug={courseSlug}
            programSlug={enrollment.programSlug}
            completed={Boolean(completion)}
          />
          <Link href="/dashboard/learning" className="btn btn-outline">Back to Learning Hub</Link>
        </div>
      </main>
    </DesignSurface>
  );
}
