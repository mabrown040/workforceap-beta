import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Target } from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { DesignSurface, PageOpener } from '@/components/portal/kit';
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
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--wa-pad-sm)' }} className="wa-space-y-6">
        <PageOpener
          kicker="Missions"
          title="Skill missions"
          lede="One pass per course. Resume bullet and STAR story."
          icon={<Target size={13} aria-hidden="true" />}
        />

        {summary ? (
          <SkillMissionPanel summary={summary} hideTitle />
        ) : (
          <MissionsEmptyState
            programSlug={programSlug}
            programTitle={activeProgram.programTitle}
          />
        )}
      </div>
    </DesignSurface>
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
    <div
      className="wa-kit-card"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
    >
      <Target size={32} aria-hidden="true" style={{ color: 'var(--wa-accent)', marginBottom: 12 }} />
      <h2 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', margin: '0 0 0.35rem' }}>
        {empty.title}
      </h2>
      <p style={{ fontSize: 14, color: 'var(--wa-muted)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
        {empty.description}
      </p>
      <Link
        href={empty.primaryAction.href}
        className="wa-kit-focus hover:wa-opacity-90 wa-inline-flex wa-items-center wa-justify-center"
        style={{
          minHeight: 44,
          padding: '10px 16px',
          background: 'var(--wa-accent)',
          color: 'var(--wa-on-accent)',
          fontWeight: 600,
          fontSize: 14,
          borderRadius: 999,
          textDecoration: 'none',
        }}
      >
        {empty.primaryAction.label}
      </Link>
    </div>
  );
}
