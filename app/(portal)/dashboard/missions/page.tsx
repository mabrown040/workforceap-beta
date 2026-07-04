import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Target } from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
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
        <PortalEmptyState
          icon={<Target size={32} aria-hidden="true" style={{ color: 'var(--color-accent)' }} />}
          title="Your missions unlock with a program"
          description="Enroll in a training program and a skill mission unlocks after each course you complete. Pass a mission to earn a resume bullet and a STAR story you can use in interviews."
          primaryAction={{ href: '/dashboard/program', label: 'Choose my program' }}
        />
      )}
    </div>
  );
}
