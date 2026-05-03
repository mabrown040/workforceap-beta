import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

import { buildPageMetadata } from '@/app/seo';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { getPartnerForUser } from '@/lib/auth/roles';
import { unlinkedPartnerHref } from '@/lib/auth/portalGuards';
import { getUser } from '@/lib/auth/server';
import { getProgramBySlug } from '@/lib/content/programs';
import { prisma } from '@/lib/db/prisma';
import { memberProgramProgressPct } from '@/lib/partner/memberProgress';

type Props = {
  params: Promise<{ memberId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { memberId } = await params;
  return buildPageMetadata({
    title: 'Member overview',
    description: 'Referred member progress (read-only).',
    path: `/partner/referred-members/${memberId}`,
  });
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

function formatDateTime(value: Date | null | undefined) {
  return value ? value.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}

function sectionHeading(title: string) {
  return <h2 style={{ fontSize: '0.75rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</h2>;
}

export default async function PartnerReferredMemberDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/referred-members');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect(await unlinkedPartnerHref(user.id));

  const { memberId } = await params;

  const referral = await prisma.partnerReferral.findFirst({
    where: { partnerId: ctx.partnerId, memberId },
  });
  if (!referral) notFound();

  const member = await prisma.user.findUnique({
    where: { id: memberId, deletedAt: null },
    select: {
      id: true,
      fullName: true,
      enrolledProgram: true,
      enrolledAt: true,
      coursesCompleted: true,
      placementRecord: {
        select: {
          employerName: true,
          jobTitle: true,
          startDate: true,
          salaryOffered: true,
          placedAt: true,
        },
      },
      userCertifications: { select: { certName: true, earnedAt: true }, orderBy: { earnedAt: 'desc' } },
    },
  });

  if (!member) notFound();

  const [recentEvents, outreachLogs, placementConfirmations] = await Promise.all([
    prisma.memberEvent.findMany({
      where: { userId: memberId },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.partnerOutreachLog.findMany({
      where: { partnerId: ctx.partnerId, memberId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        createdBy: { select: { fullName: true } },
      },
    }),
    prisma.memberEvent.findMany({
      where: { userId: memberId, eventName: 'PLACEMENT_CONFIRMATION_SUBMITTED' },
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: { metadata: true, createdAt: true },
    }),
  ]);

  const program = member.enrolledProgram ? getProgramBySlug(member.enrolledProgram) : null;
  const coursesDone = (member.coursesCompleted as string[] | null) ?? [];
  const progressPct = memberProgramProgressPct(member.enrolledProgram, member.coursesCompleted);
  const certificateCount = member.userCertifications.length;
  const outreachCount = outreachLogs.length;
  const placed = !!member.placementRecord;
  const pendingPlacement = placementConfirmations[0] ?? null;
  const recentEvent = recentEvents[0] ?? null;
  const memberStatus = placed ? 'Placed' : pendingPlacement ? 'Offer reported — review pending' : progressPct >= 80 ? 'Course-complete' : 'In training';

  function formatEventLabel(event: (typeof recentEvents)[number]) {
    if (event.metadata && typeof event.metadata === 'object' && event.metadata !== null && 'label' in event.metadata) {
      return `${event.eventName} — ${String((event.metadata as { label?: string }).label)}`;
    }
    return event.eventName;
  }

  return (
    <PortalPageFrame>
      <div style={{ paddingBottom: '6rem' }}>
        <Link href="/partner/referred-members" style={{ color: 'var(--color-accent)', display: 'inline-block', marginBottom: '1rem' }}>
          ← Back to referred members
        </Link>
        <PageHeader
          title={member.fullName}
          subtitle="Read-only overview. Contact information, assessments, and benefit requests are not shown in the partner portal."
          breadcrumbs={[
            { label: 'Referred Members', href: '/partner/referred-members' },
            { label: 'Member Details' },
          ]}
        />

        <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] wa-gap-4 md:wa-gap-6">
          <div className="wa-grid wa-grid-cols-1 wa-gap-4">
            <section className="portal-card portal-card--flat" style={{ padding: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)' }}>
                Member snapshot
              </p>
              <p style={{ margin: '0.35rem 0 0.2rem', fontSize: '1.25rem', fontWeight: 800 }}>{member.fullName}</p>
              <p style={{ margin: 0, color: 'var(--color-on-surface-variant)' }}>{program?.title ?? 'No program selected'}</p>
              <div className="wa-grid wa-grid-cols-3 wa-gap-2" style={{ marginTop: '0.85rem' }}>
                {[
                  { label: 'Progress', value: `${progressPct}%` },
                  { label: 'Certificates', value: String(certificateCount) },
                  { label: 'Outreach', value: String(outreachCount) },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{ padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--surface-container-low)' }}
                  >
                    <div style={{ fontSize: '1rem', fontWeight: 800 }}>{item.value}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="portal-card portal-card--flat" style={{ padding: '1rem' }}>
              {sectionHeading('Program')}
              <div style={{ display: 'grid', gap: '0.7rem', marginTop: '0.75rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>Enrolled</p>
                  <p style={{ margin: '0.2rem 0 0', fontWeight: 700 }}>{program?.title ?? '—'}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>Enrolled date</p>
                  <p style={{ margin: '0.2rem 0 0', fontWeight: 700 }}>{formatDate(member.enrolledAt)}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>Overall progress</p>
                  <p style={{ margin: '0.2rem 0 0', fontWeight: 700 }}>{progressPct}%</p>
                </div>
              </div>
            </section>

            {program ? (
              <section className="portal-card portal-card--flat" style={{ padding: '1rem' }}>
                {sectionHeading('Course completions')}
                <ul style={{ margin: '0.75rem 0 0', padding: 0, listStyle: 'none' }}>
                  {program.courses.map((course) => (
                    <li key={course.slug} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
                      {coursesDone.includes(course.slug) ? (
                        <CheckCircle size={18} style={{ color: 'var(--color-green)', flexShrink: 0 }} />
                      ) : (
                        <span
                          style={{
                            display: 'inline-block',
                            width: 18,
                            height: 18,
                            border: '2px solid var(--outline-variant)',
                            borderRadius: 4,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <span>{course.name}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="portal-card portal-card--flat" style={{ padding: '1rem' }}>
              {sectionHeading('Placement')}
              {member.placementRecord ? (
                <div style={{ display: 'grid', gap: '0.7rem', marginTop: '0.75rem' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>Employer</p>
                    <p style={{ margin: '0.2rem 0 0', fontWeight: 700 }}>{member.placementRecord.employerName}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>Role</p>
                    <p style={{ margin: '0.2rem 0 0', fontWeight: 700 }}>{member.placementRecord.jobTitle}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>Placed</p>
                    <p style={{ margin: '0.2rem 0 0', fontWeight: 700 }}>{formatDate(member.placementRecord.placedAt)}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>Salary</p>
                    <p style={{ margin: '0.2rem 0 0', fontWeight: 700 }}>
                      {member.placementRecord.salaryOffered != null ? `$${member.placementRecord.salaryOffered.toLocaleString()}` : '—'}
                    </p>
                  </div>
                </div>
              ) : pendingPlacement ? (
                <div style={{ marginTop: '0.75rem' }}>
                  <div
                    style={{
                      background: 'rgba(255,193,7,0.08)',
                      border: '1px solid rgba(255,193,7,0.2)',
                      borderRadius: '0.75rem',
                      padding: '0.875rem 1rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.625rem',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-warning)', flexShrink: 0 }}>pending</span>
                    <div>
                      <p style={{ margin: '0 0 0.25rem', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)' }}>Offer reported — under review</p>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
                        This member self-reported accepting a job offer. WorkforceAP staff are reviewing the report before finalizing the placement.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--color-on-surface-variant)', margin: '0.75rem 0 0' }}>Not placed yet.</p>
              )}
            </section>

            <section className="portal-card portal-card--flat" style={{ padding: '1rem' }}>
              {sectionHeading('Recent activity')}
              {recentEvents.length === 0 ? (
                <p style={{ color: 'var(--color-on-surface-variant)', margin: '0.75rem 0 0' }}>No recent member activity recorded yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
                  {recentEvents.map((event) => (
                    <div key={event.id} style={{ padding: '0.8rem', borderRadius: '0.75rem', background: 'var(--surface-container-low)' }}>
                      <p style={{ margin: 0, fontWeight: 700 }}>{formatEventLabel(event)}</p>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>{formatDateTime(event.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="portal-card portal-card--flat" style={{ padding: '1rem' }}>
              {sectionHeading('Partner outreach')}
              {outreachLogs.length === 0 ? (
                <p style={{ color: 'var(--color-on-surface-variant)', margin: '0.75rem 0 0' }}>No outreach logged yet for this member.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
                  {outreachLogs.map((log) => (
                    <div key={log.id} style={{ padding: '0.8rem', borderRadius: '0.75rem', background: 'var(--surface-container-low)' }}>
                      <p style={{ margin: 0, fontWeight: 700, textTransform: 'capitalize' }}>{log.channel}</p>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>
                        {log.createdBy.fullName} · {formatDateTime(log.createdAt)}
                      </p>
                      <p style={{ color: 'var(--color-on-surface-variant)', margin: '0.45rem 0 0', lineHeight: 1.5 }}>{log.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside style={{ display: 'grid', gap: '1rem', alignContent: 'start' }}>
            <section className="portal-card portal-card--flat" style={{ padding: '1rem' }}>
              {sectionHeading('At a glance')}
              <div style={{ display: 'grid', gap: '0.85rem', marginTop: '0.9rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Status</p>
                  <p style={{ margin: '0.3rem 0 0', fontWeight: 700 }}>{memberStatus}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Latest activity</p>
                  <p style={{ margin: '0.3rem 0 0', fontWeight: 700 }}>{recentEvent ? formatEventLabel(recentEvent) : '—'}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Latest outreach</p>
                  <p style={{ margin: '0.3rem 0 0', fontWeight: 700 }}>{outreachLogs[0] ? formatDateTime(outreachLogs[0].createdAt) : 'No outreach yet'}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Certifications</p>
                  <p style={{ margin: '0.3rem 0 0', fontWeight: 700 }}>
                    {certificateCount === 0 ? 'None on file' : `${certificateCount} certificate${certificateCount === 1 ? '' : 's'} earned`}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </PortalPageFrame>
  );
}
