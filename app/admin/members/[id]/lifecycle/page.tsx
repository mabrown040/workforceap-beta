import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import StatusBadge from '@/components/portal/StatusBadge';

export const metadata: Metadata = buildPageMetadata({
  title: 'Member lifecycle',
  description: 'Lifecycle timeline and enrollment drift audit for a member.',
  path: '/admin/members',
});

export default async function AdminMemberLifecyclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const { id: memberId } = await params;

  const [member, enrollment, events] = await Promise.all([
    prisma.user.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        fullName: true,
        email: true,
        enrolledProgram: true,
        enrolledAt: true,
        coursesCompleted: true,
        assessmentCompleted: true,
        assessmentCompletedAt: true,
        createdAt: true,
        deletedAt: true,
        placementRecord: {
          select: { employerName: true, jobTitle: true, placedAt: true },
        },
      },
    }),
    prisma.courseEnrollment.findUnique({
      where: { userId: memberId },
      select: {
        programSlug: true,
        enrolledAt: true,
        enrolledByAdminId: true,
        fundingSource: true,
      },
    }),
    prisma.memberEvent.findMany({
      where: { userId: memberId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        eventName: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
      },
    }),
  ]);

  if (!member) notFound();

  // Drift detection
  const hasDrift =
    (member.enrolledProgram && !enrollment) ||
    (!member.enrolledProgram && enrollment) ||
    (member.enrolledProgram && enrollment && member.enrolledProgram !== enrollment.programSlug);

  const completedCourses = (member.coursesCompleted as string[] | null) ?? [];

  return (
    <div>
      <PageHeader
        title="Lifecycle audit"
        subtitle={`${member.fullName ?? member.email} — enrollment, events, and drift status`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Members', href: '/admin/members' },
          { label: member.fullName ?? 'Member', href: `/admin/members/${memberId}` },
          { label: 'Lifecycle' },
        ]}
      />

      {/* Drift alert */}
      {hasDrift && (
        <div className="portal-alert portal-alert--accent" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)' }} aria-hidden="true">warning</span>
            <span style={{ fontWeight: 600, color: 'var(--color-accent)', fontSize: '0.875rem' }}>
              Enrollment drift detected
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>
            User.enrolledProgram={member.enrolledProgram ?? 'null'} vs CourseEnrollment.programSlug={enrollment?.programSlug ?? 'missing'}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="portal-grid-metrics" style={{ marginBottom: '2rem' }}>
        <div className="stitch-card stitch-card--padded">
          <p className="portal-section-title" style={{ marginBottom: '0.5rem' }}>Enrolled Program</p>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
            {member.enrolledProgram ?? '—'}
          </p>
          {member.enrolledAt && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>
              Since {member.enrolledAt.toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="stitch-card stitch-card--padded">
          <p className="portal-section-title" style={{ marginBottom: '0.5rem' }}>CourseEnrollment</p>
          {enrollment ? (
            <>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                {enrollment.programSlug}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>
                {enrollment.enrolledByAdminId ? 'Admin-enrolled' : 'Self-enrolled'} · {enrollment.fundingSource ?? 'No funding source'}
              </p>
            </>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>No record</p>
          )}
        </div>
        <div className="stitch-card stitch-card--padded">
          <p className="portal-section-title" style={{ marginBottom: '0.5rem' }}>Progress</p>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
            {completedCourses.length} course{completedCourses.length !== 1 ? 's' : ''} completed
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>
            Assessment: {member.assessmentCompleted ? 'Done' : 'Not done'}
            {member.placementRecord ? ` · Placed at ${member.placementRecord.employerName}` : ''}
          </p>
        </div>
      </div>

      {/* Event timeline */}
      <section>
        <h2 className="portal-section-heading">
          Event timeline ({events.length})
        </h2>
        {events.length === 0 ? (
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>
            No lifecycle events recorded for this member.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {events.map((ev, i) => {
              const variant = ev.eventName.includes('completed') || ev.eventName.includes('earned') || ev.eventName.includes('placed')
                ? 'success' as const
                : ev.eventName.includes('enrolled') || ev.eventName.includes('approved')
                  ? 'info' as const
                  : 'neutral' as const;
              return (
                <div
                  key={ev.id}
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    padding: '0.75rem 0',
                    borderBottom: i < events.length - 1 ? '1px solid var(--outline-variant)' : 'none',
                  }}
                >
                  <div style={{ width: '7.5rem', flexShrink: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                    {ev.createdAt.toLocaleDateString()}<br />
                    {ev.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <StatusBadge label={ev.eventName.replace(/_/g, ' ')} variant={variant} />
                    </div>
                    {ev.entityType && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                        {ev.entityType}{ev.entityId ? `: ${ev.entityId}` : ''}
                      </p>
                    )}
                    {ev.metadata && typeof ev.metadata === 'object' && Object.keys(ev.metadata as object).length > 0 && (
                      <pre style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0', whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace' }}>
                        {JSON.stringify(ev.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div style={{ marginTop: '2rem' }}>
        <Link href={`/admin/members/${memberId}`} className="btn btn-outline">
          Back to member
        </Link>
      </div>
    </div>
  );
}
