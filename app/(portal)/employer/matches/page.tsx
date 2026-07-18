import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unlinkedEmployerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import EmployerMatchHistoryClient from '@/components/employer/EmployerMatchHistoryClient';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('employer');
  return buildPageMetadataAsync({
    title: t('matchHistoryMetaTitle'),
    description: t('matchHistoryMetaDesc'),
    path: '/employer/matches',
  });
}

export default async function EmployerMatchesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/matches');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect(await unlinkedEmployerHref(user.id));

  const matches = await prisma.aIJobMatch.findMany({
    take: 5000,
    where: { job: { employerId: ctx.employerId, status: 'live' } },
    orderBy: { createdAt: 'desc' },
    include: {
      job: { select: { id: true, title: true } },
      student: { select: { id: true, fullName: true } },
    },
  });

  const keys = matches.map((m) => ({ jobId: m.jobId, studentId: m.studentId }));
  const applications =
    keys.length === 0
      ? []
      : await prisma.jobPostingApplication.findMany({
          take: 5000,
          where: { OR: keys.map((k) => ({ jobId: k.jobId, studentId: k.studentId })) },
          select: { id: true, jobId: true, studentId: true },
        });
  const appByPair = new Map(applications.map((a) => [`${a.jobId}:${a.studentId}`, a.id]));

  const initialRows = matches.map((m) => ({
    id: m.id,
    jobId: m.jobId,
    studentId: m.studentId,
    status: m.status,
    matchScore: m.matchScore,
    createdAt: m.createdAt.toISOString(),
    statusUpdatedAt: m.statusUpdatedAt?.toISOString() ?? null,
    job: m.job,
    student: m.student,
    applicationId: appByPair.get(`${m.jobId}:${m.studentId}`) ?? null,
  }));

  const t = await getTranslations('employer');

  return (
    <PortalPageFrame>
      <PageHeader
        title={t('matchHistoryMetaTitle')}
        subtitle={
          <>
            <span className="wa-block md:wa-hidden">AI matching</span>
            <span className="wa-hidden md:wa-block">
              Every candidate WorkforceAP has suggested for your live roles, with fit score and pipeline status.
            </span>
          </>
        }
      />
      <div className="wa-p-4 md:wa-p-0">
        <EmployerMatchHistoryClient initialRows={initialRows} />
      </div>
    </PortalPageFrame>
  );
}
