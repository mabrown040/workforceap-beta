import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import PageHero from '@/components/PageHero';
import MobileApplyFunnel from './MobileApplyFunnel';
import JobTailorPanel from '@/components/portal/JobTailorPanel';
import { formatJobSalaryRange } from '@/lib/jobs/formatSalary';
import { resolveSupabasePublicAssetUrl } from '@/lib/storage/publicAssetUrl';
import PageHeader from '@/components/portal/PageHeader';
import { getProgramBySlug } from '@/lib/content/programs';
import ReferralCopyButton from './ReferralCopyButton';

type Props = { params: Promise<{ id: string }> };

/** Minimal member info needed to personalize the referral intro template. */
async function getReferralInfo(userId: string): Promise<{ firstName: string | null; programTitle: string | null }> {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, enrolledProgram: true },
    });
    const firstName = dbUser?.fullName?.trim().split(/\s+/)[0] || null;
    const programTitle = dbUser?.enrolledProgram
      ? getProgramBySlug(dbUser.enrolledProgram)?.title ?? null
      : null;
    return { firstName, programTitle };
  } catch {
    return { firstName: null, programTitle: null };
  }
}

/** Deterministic, server-rendered warm-intro template — no LLM call needed. */
function buildReferralMessage(params: {
  firstName: string | null;
  jobTitle: string;
  employerName: string;
  programTitle: string | null;
}): string {
  const { firstName, jobTitle, employerName, programTitle } = params;
  const trainingLine = programTitle
    ? `I just completed ${programTitle} training and would love any insight you can share, or an introduction to the right person.`
    : `I'd love any insight you can share, or an introduction to the right person.`;
  const lines = [
    `Hi! I'm applying for the ${jobTitle} role at ${employerName} and thought of you since you work there.`,
    trainingLine,
    `Thanks so much!${firstName ? ` — ${firstName}` : ''}`,
  ];
  return lines.join('\n');
}

/** Screening-pack question shape is admin-authored JSON — degrade gracefully on unexpected fields. */
type ScreeningQuestion = { id?: string; prompt?: string; type?: string };

/** Find the active screening pack (if any) whose program matches one of the job's suggested programs. */
async function getMatchingScreeningPack(suggestedPrograms: string[]) {
  if (!suggestedPrograms || suggestedPrograms.length === 0) return null;
  try {
    return await prisma.employerScreeningPack.findFirst({
      where: { programSlug: { in: suggestedPrograms }, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  let job = null;
  try {
    job = await prisma.job.findFirst({
      where: {
        id,
        status: 'live',
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: new Date() } },
            ],
          },
        ],
      },
      select: { title: true, description: true },
    });
  } catch {
    job = null;
  }
  if (!job) return buildPageMetadataAsync({ title: 'Job', description: '', path: `/dashboard/jobs/${id}` });
  return buildPageMetadataAsync({
    title: job.title,
    description: job.description?.slice(0, 160) ?? '',
    path: `/dashboard/jobs/${id}`,
  });
}

async function getJob(id: string) {
  try {
    return await prisma.job.findFirst({
      where: {
        id,
        status: 'live',
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: new Date() } },
            ],
          },
        ],
      },
      include: { employer: { select: { companyName: true, logoUrl: true } } },
    });
  } catch {
    return null;
  }
}

export default async function JobDetailPage({ params }: Props) {
  const user = await getUser();
  const { id } = await params;

  const job = await getJob(id);
  if (!job) notFound();

  const [referralInfo, screeningPack] = await Promise.all([
    user ? getReferralInfo(user.id) : Promise.resolve(null),
    getMatchingScreeningPack(job.suggestedPrograms),
  ]);

  const referralMessage = user
    ? buildReferralMessage({
        firstName: referralInfo?.firstName ?? null,
        jobTitle: job.title,
        employerName: job.employer.companyName,
        programTitle: referralInfo?.programTitle ?? null,
      })
    : null;

  const screeningQuestions = Array.isArray(screeningPack?.questionsJson)
    ? (screeningPack.questionsJson as ScreeningQuestion[])
    : null;

  const employerLogoUrl = resolveSupabasePublicAssetUrl('employer-logos', job.employer.logoUrl);
  const salaryLine = formatJobSalaryRange(job.salaryMin, job.salaryMax);

  const LOCATION_LABELS: Record<string, string> = {
    remote: 'Remote',
    hybrid: 'Hybrid',
    onsite: 'On-site',
  };
  const JOB_TYPE_LABELS: Record<string, string> = {
    fulltime: 'Full-time',
    parttime: 'Part-time',
    contract: 'Contract',
  };

  return (
    <>
    <div className="inner-page">
      <PageHeader
        title="Job Details"
        breadcrumbs={[
          { label: 'Job Board', href: '/dashboard/jobs' },
          { label: 'Job Details' },
        ]}
      />
      <PageHero
        title={job.title}
        subtitle={`${job.employer.companyName} · ${job.location ?? LOCATION_LABELS[job.locationType] ?? job.locationType} · ${JOB_TYPE_LABELS[job.jobType] ?? job.jobType}`}
      >
        {employerLogoUrl ? (
          <div style={{ marginTop: '0.75rem' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={employerLogoUrl}
              alt=""
              width={72}
              height={72}
              style={{ objectFit: 'contain', borderRadius: 8, background: 'var(--surface-container-low)' }}
            />
          </div>
        ) : null}
      </PageHero>
      <section className="content-section" style={{ paddingTop: '1rem' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <Link href="/dashboard/jobs" style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
              ← Back to Job Board
            </Link>
          </div>

          {salaryLine && (
            <p style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
              <strong>Salary:</strong> {salaryLine}
            </p>
          )}

          {user && <JobTailorPanel jobId={job.id} />}

          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Description</h2>
            <div style={{ whiteSpace: 'pre-wrap' }}>{job.description}</div>
          </div>

          {job.requirements?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Requirements</h2>
              <ul style={{ paddingLeft: '1.25rem' }}>
                {job.requirements.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {screeningQuestions && screeningQuestions.length > 0 && (
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '1.1rem 1.25rem',
                borderRadius: '0.85rem',
                border: '1px solid var(--outline-variant)',
                background: 'var(--surface-container-low)',
              }}
            >
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>What this employer looks for</h2>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                {screeningPack!.packTitle} — shared by {screeningPack!.employerLabel}. Informational, so you can prepare before you apply.
              </p>
              <ol style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: '0.6rem' }}>
                {screeningQuestions.map((q, i) => (
                  <li key={q.id ?? i} style={{ lineHeight: 1.55 }}>
                    {q.prompt ?? 'See counselor for details.'}{' '}
                    {q.type && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>
                        ({q.type.replace(/_/g, ' ')})
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {referralMessage && (
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '1.1rem 1.25rem',
                borderRadius: '0.85rem',
                border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)',
                background: 'color-mix(in srgb, var(--color-accent) 5%, var(--surface-container-low, rgba(0,0,0,0.02)))',
              }}
            >
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>
                Know someone at {job.employer.companyName}?
              </h2>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', lineHeight: 1.5, color: 'var(--color-on-surface)' }}>
                A warm intro more than doubles your odds vs. applying cold. If you know anyone there — even loosely — send them this:
              </p>
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.88rem',
                  lineHeight: 1.55,
                  padding: '0.85rem 1rem',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--outline-variant)',
                  background: 'var(--color-surface, #fff)',
                  marginBottom: '0.75rem',
                }}
              >
                {referralMessage}
              </div>
              <ReferralCopyButton text={referralMessage} />
            </div>
          )}

          <MobileApplyFunnel
            jobId={job.id}
            authenticated={!!user}
            jobTitle={job.title}
            employerName={job.employer.companyName}
            salaryLine={salaryLine}
            location={job.location ?? LOCATION_LABELS[job.locationType] ?? job.locationType}
            jobType={JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
            description={job.description}
            requirements={job.requirements}
          />
        </div>
      </section>
    </div>    </>
  );
}
