import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Target } from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { DesignSurface, PageOpener } from '@/components/portal/kit';
import SkillMissionPanel from '@/components/portal/SkillMissionPanel';
import { getActiveProgramForDashboard } from '@/lib/member/getActiveProgramForDashboard';
import { loadSkillMissionSummary } from '@/lib/member/skillMissions';
import { SkillMissionEmpty } from '@/components/portal/SkillMissionEmpty';
import { programSlugsEquivalent } from '@/lib/content/programSlug';

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
  const activeEnrollment = activeProgram.allEnrollments.find((enrollment) =>
    programSlug ? programSlugsEquivalent(enrollment.programSlug, programSlug) : false,
  ) ?? null;
  const curriculumVersion = activeEnrollment?.curriculumVersion ?? 'legacy-v1';
  const completedCourseSlugs = programSlug
    ? dbUser?.courseProgress
        .filter((row) => programSlugsEquivalent(row.programSlug, programSlug))
        .map((row) => row.courseSlug) ?? []
    : [];

  const summary = await loadSkillMissionSummary({
    userId: user.id,
    programSlug,
    curriculumVersion,
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
          <SkillMissionEmpty
            programSlug={programSlug}
            programTitle={activeProgram.programTitle}
          />
        )}
      </div>
    </DesignSurface>
  );
}
