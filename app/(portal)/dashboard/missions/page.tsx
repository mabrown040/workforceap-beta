import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Target } from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import SkillMissionPanel from '@/components/portal/SkillMissionPanel';
import { getActiveProgramForDashboard } from '@/lib/member/getActiveProgramForDashboard';
import { skillMissionEmptyState } from '@/lib/member/skillMissionEmptyState';
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

  const [activeProgram, dbUser] = await Promise.all([
    getActiveProgramForDashboard({ userId: user.id }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        courseProgress: {
          where: { status: 'COMPLETED' },
          select: { programSlug: true, courseSlug: true },
        },
      },
    }),
  ]);

  const programSlug = activeProgram.activeProgramSlug;
  const completedCourseSlugs = programSlug
    ? dbUser?.courseProgress
        .filter((row) => row.programSlug === programSlug)
        .map((row) => row.courseSlug) ?? []
    : [];

  const summary = await loadSkillMissionSummary({
    userId: user.id,
    programSlug,
    completedCourseSlugs,
  });

  return (
    <div className="portal-main-content">
      <PageHeader
        title="Skill Missions"
        subtitle="Pass a mission after each course for a resume bullet and a STAR story."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Skill Missions' }]}
      />

      {summary ? (
        <SkillMissionPanel summary={summary} />
      ) : (
        <MissionsEmptyState
          programSlug={programSlug}
          programTitle={activeProgram.programTitle}
        />
      )}
    </div>
  );
}

function MissionsEmptyState({
  programSlug,
  programTitle,
}: {
  programSlug: string | null;
  programTitle: string | null;
}) {
  const empty = skillMissionEmptyState({ programSlug, programTitle });
  return (
    <PortalEmptyState
      icon={<Target size={32} aria-hidden="true" style={{ color: 'var(--color-accent)' }} />}
      title={empty.title}
      description={empty.description}
      primaryAction={empty.primaryAction}
    />
  );
}
