import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import DataTable from '@/components/portal/ui/DataTable';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Admin – Placement Surveys',
    description: 'View post-placement survey results and aggregate stats.',
    path: '/admin/placement-surveys',
  });
}

type SurveyWithUser = {
  id: string;
  userId: string;
  placementId: string;
  sentAt: Date;
  completedAt: Date | null;
  jobSatisfaction: number | null;
  trainingRelevance: number | null;
  supportQuality: number | null;
  whatHelpedMost: string | null;
  whatCouldImprove: string | null;
  stillEmployed: boolean | null;
  currentSalary: number | null;
  allowTestimonial: boolean;
  user: {
    fullName: string | null;
    email: string | null;
    enrolledProgram: string | null;
  };
};

export default async function AdminPlacementSurveysPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/placement-surveys');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  let surveys: SurveyWithUser[] = [];
  try {
    surveys = await prisma.placementSurvey.findMany({
      orderBy: { sentAt: 'desc' },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            enrolledProgram: true,
          },
        },
      },
    });
  } catch (e) {
    console.error('[admin/placement-surveys] load failed', e);
  }

  const completed = surveys.filter((s) => s.completedAt != null);
  const pending = surveys.filter((s) => s.completedAt == null);

  const avg = (field: 'jobSatisfaction' | 'trainingRelevance' | 'supportQuality') => {
    const vals = completed
      .map((s) => s[field])
      .filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  };

  const avgJobSatisfaction = avg('jobSatisfaction');
  const avgTrainingRelevance = avg('trainingRelevance');
  const avgSupportQuality = avg('supportQuality');
  const testimonialCount = completed.filter((s) => s.allowTestimonial).length;

  const completionRate = surveys.length > 0
    ? Math.round((completed.length / surveys.length) * 100)
    : 0;

  return (
    <div>
      <PageHeader
        title="Placement Surveys"
        subtitle="Post-placement member feedback and aggregate statistics."
      />

      {/* Stats strip */}
      <div className="portal-metric-strip" style={{ marginBottom: '1.5rem' }}>
        <div className="portal-metric-card">
          <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--accent">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>mark_email_read</span>
          </div>
          <p className="portal-metric-card__value">{surveys.length}</p>
          <p className="portal-metric-card__label">Sent</p>
        </div>
        <div className="portal-metric-card">
          <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--green">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <p className="portal-metric-card__value">{completed.length}</p>
          <p className="portal-metric-card__label">Completed</p>
        </div>
        <div className="portal-metric-card">
          <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--blue">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>percent</span>
          </div>
          <p className="portal-metric-card__value">{completionRate}%</p>
          <p className="portal-metric-card__label">Completion Rate</p>
        </div>
        <div className="portal-metric-card">
          <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--gold">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>star</span>
          </div>
          <p className="portal-metric-card__value">{avgJobSatisfaction ?? '—'}</p>
          <p className="portal-metric-card__label">Avg Satisfaction</p>
        </div>
        <div className="portal-metric-card">
          <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--accent">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>school</span>
          </div>
          <p className="portal-metric-card__value">{avgTrainingRelevance ?? '—'}</p>
          <p className="portal-metric-card__label">Avg Training</p>
        </div>
        <div className="portal-metric-card">
          <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--green">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>support_agent</span>
          </div>
          <p className="portal-metric-card__value">{avgSupportQuality ?? '—'}</p>
          <p className="portal-metric-card__label">Avg Support</p>
        </div>
        <div className="portal-metric-card">
          <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--gold">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>campaign</span>
          </div>
          <p className="portal-metric-card__value">{testimonialCount}</p>
          <p className="portal-metric-card__label">Testimonials</p>
        </div>
      </div>

      {/* Pending vs completed summary */}
      {pending.length > 0 && (
        <div
          style={{
            padding: '0.875rem 1rem',
            borderRadius: '0.625rem',
            background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-warning) 25%, transparent)',
            color: 'var(--color-warning)',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">
            schedule
          </span>
          {pending.length} survey{pending.length === 1 ? '' : 's'} pending completion
        </div>
      )}

      {/* Responses table */}
      <div className="portal-dash-section-header" style={{ marginBottom: '0.875rem' }}>
        <h2 className="portal-heading-with-bar portal-section-heading" style={{ margin: 0 }}>
          Individual Responses
        </h2>
      </div>

      {surveys.length === 0 ? (
        <div
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            background: 'var(--surface-container-low)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--color-on-surface-variant)',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
            No surveys sent yet
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
            The daily cron sends surveys to members placed ~30 days ago. Check back after the next run.
          </p>
        </div>
      ) : (
        <div className="wa-hidden md:wa-block" style={{ overflowX: 'auto' }}>
          <DataTable
            variant="admin"
            tableClassName="admin-table"
            scrollX={false}
            rows={surveys}
            rowKey={(r) => r.id}
            columns={[
              {
                key: 'member',
                header: 'Member',
                cell: (r) => (
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem' }}>
                      {r.user.fullName ?? '—'}
                    </p>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>
                      {r.user.email ?? '—'}
                    </p>
                  </div>
                ),
              },
              {
                key: 'program',
                header: 'Program',
                cell: (r) => r.user.enrolledProgram ?? '—',
              },
              {
                key: 'status',
                header: 'Status',
                cell: (r) =>
                  r.completedAt ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '999px',
                        background: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
                        color: 'var(--color-success)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }} aria-hidden="true">
                        check_circle
                      </span>
                      Completed
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '999px',
                        background: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
                        color: 'var(--color-warning)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }} aria-hidden="true">
                        schedule
                      </span>
                      Pending
                    </span>
                  ),
              },
              {
                key: 'satisfaction',
                header: 'Satisfaction',
                align: 'center',
                cell: (r) => r.jobSatisfaction ?? '—',
              },
              {
                key: 'training',
                header: 'Training',
                align: 'center',
                cell: (r) => r.trainingRelevance ?? '—',
              },
              {
                key: 'support',
                header: 'Support',
                align: 'center',
                cell: (r) => r.supportQuality ?? '—',
              },
              {
                key: 'employed',
                header: 'Still Employed',
                align: 'center',
                cell: (r) =>
                  r.stillEmployed === true ? (
                    <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>Yes</span>
                  ) : r.stillEmployed === false ? (
                    <span style={{ color: 'var(--color-error)', fontWeight: 700 }}>No</span>
                  ) : (
                    '—'
                  ),
              },
              {
                key: 'salary',
                header: 'Salary',
                align: 'right',
                cell: (r) =>
                  r.currentSalary != null
                    ? `$${r.currentSalary.toLocaleString()}`
                    : '—',
              },
              {
                key: 'testimonial',
                header: 'Testimonial',
                align: 'center',
                cell: (r) =>
                  r.allowTestimonial ? (
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-success)', fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                      check_circle
                    </span>
                  ) : (
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)' }} aria-hidden="true">
                      radio_button_unchecked
                    </span>
                  ),
              },
              {
                key: 'sent',
                header: 'Sent',
                cell: (r) =>
                  r.sentAt.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }),
              },
            ]}
          />
        </div>
      )}

      {/* Mobile card list */}
      {surveys.length > 0 && (
        <div className="md:wa-hidden" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {surveys.map((r) => (
            <div key={r.id} className="portal-card portal-card--flat" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem' }}>
                    {r.user.fullName ?? '—'}
                  </p>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>
                    {r.user.email ?? '—'}
                  </p>
                </div>
                {r.completedAt ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '999px',
                      background: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
                      color: 'var(--color-success)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    Done
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '999px',
                      background: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
                      color: 'var(--color-warning)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    Pending
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{ textAlign: 'center', padding: '0.5rem', borderRadius: '0.5rem', background: 'var(--surface-container-high)' }}>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-accent)' }}>
                    {r.jobSatisfaction ?? '—'}
                  </p>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)' }}>
                    Satisfaction
                  </p>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', borderRadius: '0.5rem', background: 'var(--surface-container-high)' }}>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-accent)' }}>
                    {r.trainingRelevance ?? '—'}
                  </p>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)' }}>
                    Training
                  </p>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', borderRadius: '0.5rem', background: 'var(--surface-container-high)' }}>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-accent)' }}>
                    {r.supportQuality ?? '—'}
                  </p>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)' }}>
                    Support
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                <span>Program: <strong style={{ color: 'var(--color-on-surface)' }}>{r.user.enrolledProgram ?? '—'}</strong></span>
                <span>Salary: <strong style={{ color: 'var(--color-on-surface)' }}>{r.currentSalary != null ? `$${r.currentSalary.toLocaleString()}` : '—'}</strong></span>
                <span>Testimonial: <strong style={{ color: 'var(--color-on-surface)' }}>{r.allowTestimonial ? 'Yes' : 'No'}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
