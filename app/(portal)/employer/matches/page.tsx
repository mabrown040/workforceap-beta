import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { unlinkedEmployerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import EmployerMatchHistoryClient from '@/components/employer/EmployerMatchHistoryClient';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { matchScoreAsPercent } from '@/lib/employer/matchScoreDisplay';
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

  const t = await getTranslations('employer');

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

  // Unique job roles for filter chips
  const uniqueJobs = Array.from(new Map(initialRows.map((r) => [r.jobId, r.job.title])).entries());

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const matchScoreColor = (pct: number) => {
    if (pct >= 85) return '#166534';
    if (pct >= 70) return '#854d0e';
    return 'var(--color-on-surface-variant)';
  };

  const matchScoreBadgeBg = (pct: number): { bg: string; border: string } => {
    if (pct >= 85) return { bg: '#dcfce7', border: '#86efac' };
    if (pct >= 70) return { bg: '#fef9c3', border: '#fde047' };
    if (pct >= 60) return { bg: '#fef2f2', border: 'rgba(173,44,77,0.2)' };
    return { bg: 'var(--surface-container)', border: 'var(--outline-variant)' };
  };

  return (
    <PortalPageFrame>
      <PageHeader
        title={t('matchHistory')}
        subtitle={
          <>
            <span className="wa-block md:wa-hidden">{t('matchHistorySubtitleMobile')}</span>
            <span className="wa-hidden md:wa-block">{t('matchHistorySubtitleDesktop')}</span>
          </>
        }
      />
      <div className="md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        {uniqueJobs.length > 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0 1rem 0.75rem' }}>
            <span className="stitch-badge stitch-badge--accent">{t('allRoles')}</span>
            {uniqueJobs.map(([jobId, title]) => (
              <span key={jobId} className="stitch-badge stitch-badge--subtle">{title}</span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', padding: '0 1rem' }}>
          {initialRows.length === 0 ? (
            <div className="portal-card portal-card--flat" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--outline-variant)', display: 'block', marginBottom: '0.75rem' }} aria-hidden="true">auto_awesome</span>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>{t('noMatchesYet')}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem' }}>{t('noMatchesDesc')}</p>
              <Link href="/employer/jobs/new" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">add</span>{t('postAJobBtn')}
              </Link>
            </div>
          ) : (
            initialRows.map((row) => {
              const pct = matchScoreAsPercent(row.matchScore);
              const badgeBg = matchScoreBadgeBg(pct);
              return (
                <div key={row.id} className="portal-card portal-card--flat employer-match-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '9999px', background: 'var(--surface-container-low)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                      {getInitials(row.student.fullName ?? '?')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="wa-truncate" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-on-surface)' }}>{row.student.fullName}</div>
                      <div className="wa-truncate" style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{row.job.title}</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right', minWidth: '3.25rem', padding: '0.35rem 0.5rem', borderRadius: '0.5rem', background: badgeBg.bg, border: `1px solid ${badgeBg.border}` }}>
                      {pct >= 60 ? (
                        <>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: matchScoreColor(pct), lineHeight: 1.2 }}>{pct}%</div>
                          <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('match')}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', lineHeight: 1.3 }}>{t('possibleFit')}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0.5rem' }}>
                    <Link href={`/employer/candidates/${row.studentId}?jobId=${encodeURIComponent(row.jobId)}`} style={{ textAlign: 'center', padding: '0.75rem 0.5rem', background: 'var(--surface-container)', color: 'var(--color-on-surface)', borderRadius: '0.5rem', fontSize: '0.775rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', minHeight: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} className="active:wa-scale-95 wa-transition-transform">{t('viewProfile')}</Link>
                    <Link href="/employer/messages" style={{ textAlign: 'center', padding: '0.75rem 0.5rem', background: 'var(--surface-container-low)', color: 'var(--color-accent)', borderRadius: '0.5rem', fontSize: '0.775rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', minHeight: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} className="active:wa-scale-95 wa-transition-transform">{t('contact')}</Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="wa-hidden md:wa-block">
        {initialRows.length === 0 ? (
          <div className="portal-card portal-card--flat" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--outline-variant)', display: 'block', marginBottom: '1rem' }} aria-hidden="true">auto_awesome</span>
            <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>{t('noMatchesYet')}</h3>
            <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>{t('noMatchesDesc')}</p>
            <Link href="/employer/jobs/new" style={{ padding: '0.625rem 1.25rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>{t('postYourFirstJob')}</Link>
          </div>
        ) : (
          <EmployerMatchHistoryClient initialRows={initialRows} />
        )}
      </div>
    </PortalPageFrame>
  );
}
