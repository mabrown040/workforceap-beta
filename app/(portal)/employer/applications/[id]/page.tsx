import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser, isSuperAdmin } from '@/lib/auth/roles';
import { unlinkedEmployerHref } from '@/lib/auth/portalGuards';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import StatusBadge from '@/components/portal/StatusBadge';
import PortalCard from '@/components/portal/ui/PortalCard';
import ApplicationStatusUpdater from '@/components/employer/ApplicationStatusUpdater';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('employer');
  return buildPageMetadata({
    title: t('applicationReviewMetaTitle'),
    description: t('applicationReviewMetaDesc'),
    path: '/employer/applications',
  });
}

export default async function EmployerApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/applications');

  const superAdmin = await isSuperAdmin(user.id);
  const ctx = await getEmployerForUser(user.id, { isSuperAdminHint: superAdmin });
  if (!ctx) {
    redirect(await unlinkedEmployerHref(user.id));
  }

  const { id } = await params;

  const application = await prisma.jobPostingApplication.findFirst({
    where: {
      id,
      job: { employerId: ctx.employerId },
    },
    include: {
      job: {
        select: { id: true, title: true, employerId: true },
      },
      student: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          enrolledProgram: true,
          profile: {
            select: {
              profileLinkedin: true,
              profileBio: true,
              resumeEnhancedPath: true,
              resumeOriginalPath: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { fullName: true, id: true } },
        },
      },
    },
  });

  if (!application) redirect('/employer');

  const statusHistory = [
    { label: 'Applied', date: application.appliedAt, active: true },
    ...(application.statusUpdatedAt
      ? [{ label: 'Status updated', date: application.statusUpdatedAt, active: true }]
      : []),
    ...(application.interviewScheduledAt
      ? [{ label: 'Interview scheduled', date: application.interviewScheduledAt, active: true }]
      : []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <PortalPageFrame maxWidth="64rem">
      <div style={{ padding: '1.5rem 1.5rem 0.75rem' }}>
        <Link
          href="/employer"
          style={{
            fontSize: '0.8125rem',
            color: 'var(--color-accent)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            marginBottom: '0.5rem',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">
            arrow_back
          </span>
          Back to jobs
        </Link>

        <h1
          className="wa-text-2xl wa-font-extrabold wa-tracking-tight"
          style={{ color: 'var(--color-on-surface)', lineHeight: 1.2 }}
        >
          {application.student.fullName}
        </h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>
          Applying for: <strong style={{ color: 'var(--color-on-surface)' }}>{application.job.title}</strong>
        </p>
      </div>

      <div
        className="portal-pad-x"
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}
      >
        {/* Status Card */}
        <PortalCard className="portal-card--flat">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <p style={{ fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', margin: '0 0 0.25rem' }}>
                Current Status
              </p>
              <StatusBadge
                label={
                  application.status === 'hired'
                    ? 'Hired'
                    : application.status === 'rejected'
                      ? 'Rejected'
                      : application.status === 'interview'
                        ? 'Interview'
                        : application.status === 'offered'
                          ? 'Offered'
                          : application.status === 'reviewing'
                            ? 'Reviewing'
                            : 'Pending'
                }
                variant={
                  application.status === 'hired'
                    ? 'success'
                    : application.status === 'rejected'
                      ? 'error'
                      : application.status === 'interview'
                        ? 'info'
                        : application.status === 'offered'
                          ? 'success'
                          : application.status === 'reviewing'
                            ? 'info'
                            : 'warning'
                }
              />
            </div>
            <ApplicationStatusUpdater applicationId={application.id} currentStatus={application.status} />
          </div>
        </PortalCard>

        {/* Applicant Info */}
        <PortalCard className="portal-card--flat">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.75rem' }}>Applicant Details</h3>
          <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</span>
              <p style={{ margin: '0.125rem 0 0' }}>{application.student.email}</p>
            </div>
            {application.student.phone && (
              <div>
                <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</span>
                <p style={{ margin: '0.125rem 0 0' }}>{application.student.phone}</p>
              </div>
            )}
            {application.student.enrolledProgram && (
              <div>
                <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Program</span>
                <p style={{ margin: '0.125rem 0 0' }}>{application.student.enrolledProgram}</p>
              </div>
            )}
            {application.student.profile?.profileLinkedin && (
              <div>
                <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>LinkedIn</span>
                <p style={{ margin: '0.125rem 0 0' }}>
                  <a href={application.student.profile.profileLinkedin} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>
                    View Profile
                  </a>
                </p>
              </div>
            )}
            {application.student.profile?.profileBio && (
              <div>
                <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bio</span>
                <p style={{ margin: '0.125rem 0 0', lineHeight: 1.5 }}>{application.student.profile.profileBio}</p>
              </div>
            )}
            {(application.student.profile?.resumeEnhancedPath || application.student.profile?.resumeOriginalPath) && (
              <div>
                <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resume</span>
                <p style={{ margin: '0.125rem 0 0' }}>
                  <a
                    href={application.student.profile?.resumeEnhancedPath || application.student.profile?.resumeOriginalPath || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    Download Resume
                  </a>
                </p>
              </div>
            )}
          </div>
        </PortalCard>

        {/* Employer Notes */}
        <PortalCard className="portal-card--flat">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.75rem' }}>Employer Notes</h3>
          {application.employerNotes ? (
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{application.employerNotes}</p>
          ) : (
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>No notes yet. Add notes in the admin panel.</p>
          )}
        </PortalCard>

        {/* Message History */}
        {application.messages.length > 0 && (
          <PortalCard className="portal-card--flat">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.75rem' }}>Message History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {application.messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: msg.authorId === user.id ? 'rgba(173,44,77,0.08)' : 'var(--surface-container)',
                    border: `1px solid ${msg.authorId === user.id ? 'rgba(173,44,77,0.15)' : 'var(--outline-variant)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{msg.author?.fullName ?? 'User'}</span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>
                      {new Date(msg.createdAt).toLocaleDateString('en-US')}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', margin: 0, lineHeight: 1.5 }}>{msg.body}</p>
                </div>
              ))}
            </div>
          </PortalCard>
        )}
      </div>    </PortalPageFrame>
  );
}
