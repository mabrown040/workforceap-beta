import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

import { buildPageMetadata } from '@/app/seo';
import PageHeader from '@/components/portal/PageHeader';
import { getPartnerForUser } from '@/lib/auth/roles';
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

export default async function PartnerReferredMemberDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/referred-members');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

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

  const [recentEvents, outreachLogs] = await Promise.all([
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
  ]);

  const program = member.enrolledProgram ? getProgramBySlug(member.enrolledProgram) : null;
  const coursesDone = (member.coursesCompleted as string[] | null) ?? [];
  const progressPct = memberProgramProgressPct(member.enrolledProgram, member.coursesCompleted);

  function formatEventLabel(event: (typeof recentEvents)[number]) {
    if (event.metadata && typeof event.metadata === 'object' && event.metadata !== null && 'label' in event.metadata) {
      return `${event.eventName} — ${String((event.metadata as { label?: string }).label)}`;
    }
    return event.eventName;
  }

  return (
    <div>
      <Link href="/partner/referred-members" style={{ color: 'var(--color-accent)', display: 'inline-block', marginBottom: '1rem' }}>
        ← Back to referred members
      </Link>
      <PageHeader
        title={member.fullName}
        subtitle="Read-only overview. Contact information, assessments, and benefit requests are not shown in the partner portal."
      />

      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--color-light)', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Program</h2>
        <p>
          <strong>Enrolled:</strong> {program?.title ?? '—'}
        </p>
        <p>
          <strong>Enrolled date:</strong> {member.enrolledAt?.toLocaleDateString() ?? '—'}
        </p>
        <p>
          <strong>Overall progress:</strong> {progressPct}%
        </p>
      </section>

      {program ? (
        <section style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--color-light)', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Course completions</h2>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyle: 'none' }}>
            {program.courses.map((course) => (
              <li key={course.slug} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                {coursesDone.includes(course.slug) ? (
                  <CheckCircle size={18} style={{ color: 'var(--color-green)', flexShrink: 0 }} />
                ) : (
                  <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid var(--outline-variant)', borderRadius: 4, flexShrink: 0 }} />
                )}
                {course.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--color-light)', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Certificates</h2>
        {member.userCertifications.length === 0 ? (
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>None on file yet.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {member.userCertifications.map((certification) => (
              <li key={certification.certName}>
                {certification.certName} — {certification.earnedAt.toLocaleDateString()}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--color-light)', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Placement</h2>
        {member.placementRecord ? (
          <>
            <p>
              <strong>Employer:</strong> {member.placementRecord.employerName}
            </p>
            <p>
              <strong>Role:</strong> {member.placementRecord.jobTitle}
            </p>
            <p>
              <strong>Placed:</strong> {member.placementRecord.placedAt.toLocaleDateString()}
            </p>
            {member.placementRecord.salaryOffered != null ? (
              <p>
                <strong>Salary (annual):</strong> ${member.placementRecord.salaryOffered.toLocaleString()}
              </p>
            ) : null}
          </>
        ) : (
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>Not placed yet.</p>
        )}
      </section>

      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--color-light)', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Recent activity</h2>
        {recentEvents.length === 0 ? (
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>No recent member activity recorded yet.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {recentEvents.map((event) => (
              <li key={event.id} style={{ marginBottom: '0.5rem' }}>
                <strong>{formatEventLabel(event)}</strong> — {event.createdAt.toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--color-light)', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Partner outreach</h2>
        {outreachLogs.length === 0 ? (
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>No outreach logged yet for this member.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {outreachLogs.map((log) => (
              <li key={log.id} style={{ marginBottom: '0.75rem' }}>
                <strong style={{ textTransform: 'capitalize' }}>{log.channel}</strong> by {log.createdBy.fullName} on{' '}
                {log.createdAt.toLocaleString()}
                <div style={{ color: 'var(--color-on-surface-variant)', marginTop: '0.15rem' }}>{log.note}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
