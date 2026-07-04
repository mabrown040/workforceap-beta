import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { isExcludedPublicEmployerName, isExcludedPublicJobTitle } from '@/lib/jobs/publicJobFilters';
import { resolveSupabasePublicAssetUrl } from '@/lib/storage/publicAssetUrl';
import { getAgeGroup } from '@/lib/util/ageCalculation';
import PageHeader from '@/components/portal/PageHeader';
import LogExternalApplicationButton from '@/components/portal/jobs/LogExternalApplicationButton';
import JobsListingClient from './JobsListingClient';
import JobsBoardSkeleton from './JobsBoardSkeleton';
import { getTranslations } from 'next-intl/server';
import { MemberJobsKit } from '@/components/portal/kit/pages/member/MemberJobsKit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
  title: t('jobBoard'),
  description: t('jobBoardDescription'),
  path: '/dashboard/jobs',
});
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams?: Promise<{ ui?: string }>;
}) {
  const user = await getUser();

  const params = await searchParams;
  const requestedUi = typeof params?.ui === 'string' ? params.ui : null;

  const t = await getTranslations('dashboard');

  let ageGroup: 'under14' | 'youth14to17' | 'adult18plus' = 'adult18plus';
  let profileCity: string | null = null;
  let profileState: string | null = null;
  // SSR: fetch applied job IDs so job cards can show "Applied" badge.
  let appliedJobIds: string[] = [];
  // Pull the member's tracked applications (all statuses) — SAVED rows feed
  // the "Saved" KPI; the rest drive the KPIs + pipeline table below. Only
  // needed for the default (non-legacy) member kit view.
  let pipelineRows: Array<{
    id: string;
    role: string;
    company: string;
    location: string | null;
    appliedAt: Date | null;
    createdAt: Date;
    status: 'SAVED' | 'APPLIED' | 'PHONE_SCREEN' | 'INTERVIEWING' | 'OFFER' | 'ACCEPTED' | 'REJECTED';
  }> = [];
  const needsPipeline = requestedUi !== 'legacy' && !!user;

  if (user) {
    // Only the job-board query below depends on the profile (ageGroup); the
    // applied-IDs and pipeline reads are independent of it and of each
    // other, so run all three together instead of one round trip at a time.
    const [profileResult, appliedResult, pipelineResult] = await Promise.allSettled([
      prisma.profile.findUnique({
        where: { userId: user.id },
        select: { dob: true, isMinor: true, city: true, state: true },
      }),
      prisma.jobApplication.findMany({
        take: 500,
        where: { userId: user.id, status: { not: 'SAVED' }, curatedJobId: { not: null } },
        select: { curatedJobId: true },
      }),
      needsPipeline
        ? prisma.jobApplication.findMany({
            take: 200,
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              role: true,
              company: true,
              status: true,
              appliedAt: true,
              createdAt: true,
              curatedJob: { select: { location: true } },
            },
          }).then((rows) =>
            rows.map((r) => ({
              id: r.id,
              role: r.role,
              company: r.company,
              location: r.curatedJob?.location ?? null,
              appliedAt: r.appliedAt,
              createdAt: r.createdAt,
              status: r.status,
            })),
          )
        : Promise.resolve(pipelineRows),
    ]);

    if (profileResult.status === 'fulfilled') {
      const profile = profileResult.value;
      if (profile?.dob) {
        ageGroup = getAgeGroup(profile.dob);
      }
      profileCity = profile?.city?.trim() || null;
      profileState = profile?.state?.trim() || null;
    } else {
      ageGroup = 'adult18plus';
    }

    if (appliedResult.status === 'fulfilled') {
      appliedJobIds = appliedResult.value
        .map((a) => a.curatedJobId)
        .filter((id): id is string => id !== null);
    } /* non-critical — badge just will not show */

    pipelineRows = pipelineResult.status === 'fulfilled' ? pipelineResult.value : [];
  }

  const primaryLocation = [profileCity, profileState].filter(Boolean).join(', ') || 'Austin, TX';
  const quickLocations = [
    primaryLocation,
    'Austin, TX',
    'Round Rock, TX',
    'Cedar Park, TX',
    'Pflugerville, TX',
  ].filter((location, index, arr) => arr.indexOf(location) === index);
  const externalBoards = [
    {
      label: 'Indeed',
      href: `https://www.indeed.com/jobs?${new URLSearchParams({ q: 'jobs', l: primaryLocation }).toString()}`,
      note: 'Largest local coverage across industries.',
      bestFor: 'fastest broad search',
    },
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/jobs/search/?${new URLSearchParams({ keywords: 'jobs', location: primaryLocation }).toString()}`,
      note: 'Strong for professional, tech, and corporate roles.',
      bestFor: 'office, tech, and employer networking',
    },
    {
      label: 'Glassdoor',
      href: `https://www.glassdoor.com/Job/jobs.htm?${new URLSearchParams({ 'sc.keyword': `jobs ${primaryLocation}` }).toString()}`,
      note: 'Job listings plus salary and company review context.',
      bestFor: 'salary checks before you apply',
    },
    {
      label: 'ZipRecruiter',
      href: `https://www.ziprecruiter.com/jobs-search?${new URLSearchParams({ search: 'jobs', location: primaryLocation }).toString()}`,
      note: 'Good metro and suburb coverage.',
      bestFor: 'wider Austin-metro reach',
    },
    {
      label: 'WorkInTexas / AustinJobs',
      href: 'https://www.workintexas.com/vosnet/Default.aspx',
      note: 'Texas Workforce Commission portal for local and public-sector roles.',
      bestFor: 'public-sector and workforce-system jobs',
    },
  ];

  // SSR: Prefetch first 20 jobs for SEO and faster initial load
  let initialJobs: Array<{
    id: string;
    title: string;
    location: string | null;
    locationType: string;
    jobType: string;
    salaryMin: number | null;
    salaryMax: number | null;
    employer: { companyName: string; logoUrl: string | null };
  }> = [];
  let initialTotal = 0;

  try {
    const jobs = await prisma.job.findMany({
      where: {
        status: 'live',
        AND: [
          ...(ageGroup === 'under14' ? [{ id: 'impossible-match' }] : []),
          ...(ageGroup === 'youth14to17' ? [{
            youthAppropriate: true,
            OR: [
              { minimumAge: null },
              { minimumAge: { lte: 17 } },
            ],
          }] : []),
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: new Date() } },
            ],
          },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        employer: { select: { companyName: true, logoUrl: true } },
      },
    });
    const visible = jobs
      .filter(
        (j) => !isExcludedPublicEmployerName(j.employer.companyName) && !isExcludedPublicJobTitle(j.title),
      )
      .map((job) => ({
        ...job,
        employer: {
          ...job.employer,
          logoUrl: resolveSupabasePublicAssetUrl('employer-logos', job.employer.logoUrl),
        },
      }));
    initialJobs = visible;
    initialTotal = visible.length;
  } catch {
    // Fallback to empty state if query fails
    initialJobs = [];
    initialTotal = 0;
  }

  // ── v2 KIT is the DEFAULT member job-pipeline view (real data); legacy
  // public board stays reachable via ?ui=legacy. This board is public, so the
  // pipeline kit only renders for a signed-in member — anonymous visitors fall
  // through to the legacy public board below (preserving the current default).
  if (needsPipeline) {
    // `pipelineRows` was already fetched above (in parallel with the
    // profile + applied-IDs reads) since `needsPipeline` is known purely
    // from `requestedUi`/`user`, before any DB round trip.
    const savedCount = pipelineRows.filter((r) => r.status === 'SAVED').length;
    const appliedCount = pipelineRows.filter((r) =>
      r.status === 'APPLIED' || r.status === 'PHONE_SCREEN',
    ).length;
    const interviewingCount = pipelineRows.filter((r) => r.status === 'INTERVIEWING').length;
    const offersCount = pipelineRows.filter((r) =>
      r.status === 'OFFER' || r.status === 'ACCEPTED',
    ).length;

    // Map the JobApplicationStatus enum to the kit's stage label + tone.
    const STAGE_META: Record<
      typeof pipelineRows[number]['status'],
      { label: string; tone: 'ok' | 'warn' | 'alert' | 'info' | 'muted' }
    > = {
      SAVED: { label: 'Saved', tone: 'muted' },
      APPLIED: { label: 'Applied', tone: 'muted' },
      PHONE_SCREEN: { label: 'Screening', tone: 'info' },
      INTERVIEWING: { label: 'Interviewing', tone: 'warn' },
      OFFER: { label: 'Offer', tone: 'ok' },
      ACCEPTED: { label: 'Accepted', tone: 'ok' },
      REJECTED: { label: 'Closed', tone: 'alert' },
    };
    const fmtDay = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Pipeline table excludes pure "saved" rows (those feed the Saved KPI only).
    const applications = pipelineRows
      .filter((r) => r.status !== 'SAVED')
      .slice(0, 20)
      .map((r) => ({
        id: r.id,
        role: r.role,
        company: r.company,
        location: r.location ?? '—',
        applied: fmtDay(r.appliedAt ?? r.createdAt),
        stage: STAGE_META[r.status].label,
        tone: STAGE_META[r.status].tone,
      }));

    // "Recommended for you" — prefer the member's real computed AIJobMatch
    // scores (already run by the admin/employer match pipeline) over the
    // generic "newest live jobs" fallback, so the % badge reflects an actual
    // score instead of a fabricated "New" label.
    const aiMatches = await prisma.aIJobMatch.findMany({
      where: {
        studentId: user!.id,
        job: {
          status: 'live',
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
      },
      orderBy: { matchScore: 'desc' },
      take: 3,
      select: {
        matchScore: true,
        matchReasons: true,
        job: {
          select: {
            id: true,
            title: true,
            location: true,
            salaryMin: true,
            salaryMax: true,
            employer: { select: { companyName: true } },
          },
        },
      },
    }).catch(() => []);

    const formatSalary = (min: number | null, max: number | null) =>
      min && max ? `$${Math.round(min / 1000)}k–${Math.round(max / 1000)}k` : null;

    const recommended = aiMatches.length > 0
      ? aiMatches.map((m) => ({
          id: m.job.id,
          logo: (m.job.employer.companyName || '?').slice(0, 2).toUpperCase(),
          match: `${m.matchScore}% match`,
          title: m.job.title,
          meta: [m.job.employer.companyName, m.job.location, formatSalary(m.job.salaryMin, m.job.salaryMax)]
            .filter(Boolean)
            .join(' · '),
          matchReasons: m.matchReasons,
        }))
      : initialJobs.slice(0, 3).map((job) => {
          const meta = [job.employer.companyName, job.location, formatSalary(job.salaryMin, job.salaryMax)]
            .filter(Boolean)
            .join(' · ');
          return {
            id: job.id,
            logo: (job.employer.companyName || '?').slice(0, 2).toUpperCase(),
            match: 'New',
            title: job.title,
            meta,
          };
        });

    return (
      <MemberJobsKit
        saved={savedCount}
        applied={appliedCount}
        interviewing={interviewingCount}
        offers={offersCount}
        syncedLabel={`${applications.length} active application${applications.length === 1 ? '' : 's'}`}
        browseHref="/dashboard/jobs?ui=legacy"
        // Pass the member's REAL rows (DataTable renders its own empty state).
        // Recommended falls back to the kit's demo cards only when the live
        // board returned nothing, to avoid a bare "Recommended" heading.
        applications={applications}
        recommended={recommended.length > 0 ? recommended : undefined}
      />
    );
  }

  return (
    <>
    <div className="inner-page">
      <PageHeader
        title={t('jobBoard')}
        subtitle={t('jobBoardSubtitle')}
        breadcrumbs={[{ label: t('memberPortal'), href: '/dashboard' }, { label: t('jobBoard') }]}
      />
      <section className="content-section" style={{ paddingTop: '1rem' }}>
        <div className="container">
          {/* S1-3: Cert-to-job pathway banner — certs that open doors */}
          {user ? (
            <div
              style={{
                padding: '1.125rem 1.25rem',
                background: 'color-mix(in srgb, var(--color-accent) 6%, var(--surface-container-low))',
                border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)',
                borderLeft: '3px solid var(--color-accent)',
                borderRadius: '0.875rem',
                marginBottom: '1.25rem',
              }}
            >
              <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: '0 0 0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('certificatesThatOpenDoors')}
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                {t('certificatesDescription')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                {[
                  'Google IT Support',
                  'CompTIA A+',
                  'AWS Cloud Practitioner',
                  'Google Project Management',
                  'IBM Data Analyst',
                ].map((cert) => (
                  <a
                    key={cert}
                    href="/dashboard/certifications"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.3125rem 0.75rem',
                      background: 'var(--surface-container)',
                      border: '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)',
                      borderRadius: '99px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--color-accent)',
                      textDecoration: 'none',
                    }}
                  >
                    {cert}
                  </a>
                ))}
                <a
                  href="/dashboard/certifications"
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--color-on-surface-variant)',
                    textDecoration: 'none',
                    marginLeft: '0.25rem',
                  }}
                >
                  {t('viewAllCerts')} →
                </a>
              </div>
            </div>
          ) : null}

          {user ? (
            // Quiet bordered surface — the accent-filled button below is this
            // view's one color-carrying call to action; the cert-pathway
            // banner above already owns the page's single accent-tinted hero,
            // so this stays neutral to avoid two competing color blocks.
            <div
              className="portal-card portal-card--flat"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 1.25rem',
                border: '1px solid color-mix(in srgb, var(--outline-variant) 55%, transparent)',
                background: 'var(--surface-container-low)',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: '14rem' }}>
                <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-on-surface)', margin: '0 0 0.2rem' }}>
                  {t('alreadyAppliedQuestion')}
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-on-surface-variant)', margin: 0, lineHeight: 1.45 }}>
                  {t('logApplicationHere')}
                </p>
              </div>
              <LogExternalApplicationButton variant="primary" />
            </div>
          ) : null}

          {/* External search engines */}
          <div style={{
            padding: '0.875rem 1.25rem',
            background: 'var(--surface-container-low)',
            border: '1px solid color-mix(in srgb, var(--outline-variant) 55%, transparent)',
            borderRadius: '0.875rem',
            marginBottom: '1.25rem',
          }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-on-surface)', margin: '0 0 0.125rem' }}>
                {t('searchBeyondBoard')}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                {user && profileCity
                  ? `Using your profile location: ${primaryLocation}.`
                  : 'If no city is saved yet, start with Austin metro and nearby suburbs.'}
              </p>
              {user ? (
                <p style={{ fontSize: '0.75rem', margin: '0.35rem 0 0' }}>
                  <a href="/dashboard/profile" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
                    {t('updateProfileLocation')} →
                  </a>
                </p>
              ) : null}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' }}>
              {externalBoards.map((engine) => (
                <a
                  key={engine.label}
                  href={engine.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wa-transition-[border-color,box-shadow] wa-duration-150 hover:wa-shadow-sm"
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block', borderRadius: '0.875rem' }}
                >
                  <div
                    className="portal-card portal-card--flat hover:wa-border-[var(--color-accent)]"
                    style={{ padding: '0.875rem', height: '100%', transition: 'border-color 150ms ease' }}
                  >
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: '0 0 0.2rem' }}>
                      {engine.label} ↗
                    </p>
                    <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-accent)', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Best for: {engine.bestFor}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: 0, lineHeight: 1.45 }}>
                      {engine.note}
                    </p>
                  </div>
                </a>
              ))}
            </div>
            <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid color-mix(in srgb, var(--outline-variant) 45%, transparent)' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: '0 0 0.4rem' }}>
                {t('quickAustinPresets')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.875rem' }}>
                {quickLocations.map((location) => (
                  <a
                    key={location}
                    href={`https://www.indeed.com/jobs?${new URLSearchParams({ q: 'jobs', l: location }).toString()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                  >
                    {location.replace(', TX', '')} ↗
                  </a>
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: '0 0 0.35rem' }}>
                {t('bestRoutineForMembers')}
              </p>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.45 }}>
                {t('bestRoutineDescription')}
              </p>
              <ul style={{ margin: 0, paddingLeft: '1rem', color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', lineHeight: 1.5 }}>
                <li>{t('checkIndeedLinkedIn')}</li>
                <li>{t('useWorkInTexas')}</li>
                <li>{t('logEveryApplication')}</li>
              </ul>
            </div>
          </div>

          {!user ? (
            <p className="jobs-public-cta" style={{ marginBottom: '1.25rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
              <strong>{t('applyingIsForMembers')}</strong>{' '}
              <a href="/login?redirectTo=/dashboard/jobs" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                {t('logIn')}
              </a>{' '}
              {t('or')}{' '}
              <a href="/apply" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                {t('startApplication')}
              </a>{' '}
              {t('toSubmitProfile')}
            </p>
          ) : null}
          {ageGroup === 'under14' ? (
            <div style={{
              padding: '2rem',
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                {t('careerExplorationYoung')}
              </h3>
              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: '1rem' }}>
                {t('careerExplorationYoungDesc')}
              </p>
              <a href="/programs" className="btn btn-primary">
                {t('exploreTrainingPrograms')}
              </a>
            </div>
          ) : ageGroup === 'youth14to17' ? (
            <>
              <div style={{
                padding: '1rem',
                background: 'var(--surface-container)',
                border: '1px solid var(--surface-container-highest)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem'
              }}>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  <strong>{t('youthJobBoard')}</strong> {t('youthJobBoardDesc')}
                </p>
              </div>
              <Suspense fallback={<JobsBoardSkeleton />}>
                <JobsListingClient
                  isAuthenticated={!!user}
                  ageGroup={ageGroup}
                  initialJobs={initialJobs}
                  initialTotal={initialTotal}
                  appliedJobIds={appliedJobIds}
                />
              </Suspense>
            </>
          ) : (
            <Suspense fallback={<JobsBoardSkeleton />}>
              <JobsListingClient
                isAuthenticated={!!user}
                ageGroup={ageGroup}
                initialJobs={initialJobs}
                initialTotal={initialTotal}
                appliedJobIds={appliedJobIds}
              />
            </Suspense>
          )}
        </div>
      </section>
    </div>    </>
  );
}
