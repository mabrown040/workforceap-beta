import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Target, ArrowRight } from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import SkillMissionPanel from '@/components/portal/SkillMissionPanel';
import { loadSkillMissionSummary } from '@/lib/member/skillMissions';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Skill Missions',
    description:
      'Prove what you learned. Complete a mission after each course to earn resume bullets and interview-ready STAR stories.',
    path: '/dashboard/missions',
  });
}

export default async function SkillMissionsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/missions');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      enrolledProgram: true,
      courseProgress: {
        where: { status: 'COMPLETED' },
        select: { programSlug: true, courseSlug: true },
      },
    },
  });

  const enrolledProgram = dbUser?.enrolledProgram ?? null;
  const completedCourseSlugs = enrolledProgram
    ? dbUser?.courseProgress
        .filter((row) => row.programSlug === enrolledProgram)
        .map((row) => row.courseSlug) ?? []
    : [];

  const summary = await loadSkillMissionSummary({
    userId: user.id,
    programSlug: enrolledProgram,
    completedCourseSlugs,
  });

  return (
    <div className="portal-main-content">
      <PageHeader
        title="Skill Missions"
        subtitle="Prove what you learned — every passed mission earns a resume bullet and an interview-ready STAR story."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Skill Missions' }]}
      />

      {summary ? (
        <SkillMissionPanel summary={summary} />
      ) : (
        <div
          className="portal-card portal-card--flat"
          style={{ maxWidth: '560px', textAlign: 'center', padding: '2.5rem 1.5rem', margin: '0 auto' }}
        >
          <Target
            size={40}
            aria-hidden="true"
            style={{ color: 'var(--color-accent)', margin: '0 auto 0.75rem', display: 'block' }}
          />
          <h2 className="portal-section-title" style={{ marginBottom: '0.5rem' }}>
            Your missions unlock with a program
          </h2>
          <p
            style={{
              color: 'var(--color-on-surface-variant)',
              lineHeight: 1.6,
              marginBottom: '1.25rem',
            }}
          >
            Enroll in a training program and a skill mission unlocks after each course you
            complete. Pass a mission to earn a resume bullet and a STAR story you can use in
            interviews.
          </p>
          <Link
            href="/dashboard/program"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            Choose my program
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
