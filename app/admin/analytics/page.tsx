import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { loadAnalyticsOverview } from '@/lib/admin/analyticsOverview';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PageHeader from '@/components/portal/PageHeader';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Analytics overview',
    description: 'Program health at a glance — enrollment, training, outcomes and funding.',
    path: '/admin/analytics',
  });
}

const SURFACE = 'var(--surface-container-low)';
const CARD_BG = 'var(--surface-container)';
const MUTED = 'var(--color-on-surface-variant)';

function StatCard({
  value,
  label,
  hint,
  accent,
}: {
  value: string | number;
  label: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div
      className="portal-card portal-card--flat"
      style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}
    >
      <span
        style={{
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          fontWeight: 700,
          lineHeight: 1,
          color: accent ?? 'var(--color-on-surface)',
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: MUTED,
        }}
      >
        {label}
      </span>
      {hint ? (
        <span style={{ fontSize: '0.78rem', color: MUTED, lineHeight: 1.35 }}>{hint}</span>
      ) : null}
    </div>
  );
}

function SectionShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: SURFACE,
        borderRadius: '0.75rem',
        overflow: 'hidden',
        boxShadow: '0 4px 32px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(226,226,229,0.05)', background: CARD_BG }}>
        <h2 className="portal-section-heading" style={{ margin: 0 }}>
          {title}
        </h2>
        {subtitle ? (
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: MUTED }}>{subtitle}</p>
        ) : null}
      </div>
      <div style={{ padding: '1.5rem' }}>{children}</div>
    </section>
  );
}

/** Simple CSS bar — no charting lib. `pct` is 0–100. */
function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div
      style={{
        height: '0.6rem',
        borderRadius: '999px',
        background: 'var(--surface-container-highest)',
        overflow: 'hidden',
      }}
    >
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', background: color }} />
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/analytics');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const { funnel, engagement, outcomes, funding, programs, acquisition } =
    await loadAnalyticsOverview();

  const funnelSteps: Array<{ label: string; value: number; hint: string }> = [
    { label: 'Total members', value: funnel.totalMembers, hint: 'Everyone in the system.' },
    {
      label: 'Enrolled in a program',
      value: funnel.enrolledInProgram,
      hint: 'Members assigned to a training track.',
    },
    {
      label: 'Active in training',
      value: funnel.activeInTraining,
      hint: 'Started but not yet finished their courses.',
    },
    { label: 'Completed', value: funnel.completed, hint: 'Finished their program.' },
  ];
  const funnelMax = Math.max(1, ...funnelSteps.map((s) => s.value));

  const acquisitionMax = Math.max(0, ...acquisition.steps.map((s) => s.count));

  const fundingTotal = funding.reduce((sum, f) => sum + f.count, 0);
  const topPrograms = programs.slice(0, 8);
  const programMax = Math.max(1, ...topPrograms.map((p) => p.count));

  return (
    <PortalPageFrame>
      <PageHeader
        title="Analytics overview"
        subtitle="Program health at a glance — who's enrolled, how training is going, and where members land."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', padding: '0 0.25rem' }}>
        {/* ── 0. Apply funnel (acquisition, last 30 days) ── */}
        <SectionShell
          title={`Apply funnel (last ${acquisition.windowDays} days)`}
          subtitle="How new applicants move from creating an account to an approved application. Percentages show conversion from the previous step."
        >
          {acquisitionMax === 0 ? (
            <p style={{ margin: 0, fontSize: '0.875rem', color: MUTED }}>
              No apply-funnel activity in the last {acquisition.windowDays} days.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {acquisition.steps.map((step) => (
                <div key={step.key}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: '0.4rem',
                      gap: '0.75rem',
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                      {step.label}
                    </span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                      {step.count.toLocaleString()}
                      {step.conversionPct != null ? (
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: MUTED, marginLeft: '0.5rem' }}>
                          {step.conversionPct}% of previous
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <Bar pct={(step.count / acquisitionMax) * 100} color="#3b82f6" />
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: MUTED }}>{step.hint}</p>
                </div>
              ))}
              <p style={{ margin: 0, fontSize: '0.78rem', color: MUTED }}>
                {acquisition.qualifiedScreenings.toLocaleString()} of the eligibility checks qualified for
                funded training.
              </p>
            </div>
          )}
        </SectionShell>

        {/* ── 1. Enrollment funnel ── */}
        <SectionShell
          title="Enrollment funnel"
          subtitle="How members move from sign-up to finishing a program. Each step is a subset of the one before it."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {funnelSteps.map((step) => (
              <div key={step.label}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '0.4rem',
                    gap: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                    {step.label}
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                    {step.value.toLocaleString()}
                  </span>
                </div>
                <Bar pct={(step.value / funnelMax) * 100} color="var(--color-accent)" />
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: MUTED }}>{step.hint}</p>
              </div>
            ))}
          </div>
        </SectionShell>

        {/* ── 2. Engagement / risk ── */}
        <SectionShell
          title="Engagement & risk"
          subtitle="Based on recent member activity (last 30 days). Members at risk or inactive may need outreach."
        >
          <div className="portal-grid-metrics" style={{ marginBottom: '1rem' }}>
            <StatCard value={engagement.active} label="Active" hint="Engaged in the last 7 days." accent="#16a34a" />
            <StatCard value={engagement.atRisk} label="At risk" hint="Quiet for 7–14 days." accent="#d97706" />
            <StatCard value={engagement.inactive} label="Inactive" hint="No activity for 14+ days." accent="#dc2626" />
          </div>
          <div className="portal-grid-metrics">
            <StatCard
              value={engagement.notStarted}
              label="Not started"
              hint="Enrolled but no course progress yet."
            />
            <StatCard
              value={engagement.stalled}
              label="Stalled in training"
              hint="No training activity in 14+ days."
            />
          </div>
        </SectionShell>

        {/* ── 3. Outcomes ── */}
        <SectionShell
          title="Outcomes"
          subtitle="Job placements and how they compare to the number of members who finished training."
        >
          <div className="portal-grid-metrics">
            <StatCard
              value={outcomes.placements}
              label="Placements"
              hint="Members placed into a job."
              accent="#80d99f"
            />
            <StatCard
              value={outcomes.placementRatePct == null ? '—' : `${outcomes.placementRatePct}%`}
              label="Placement rate"
              hint="Placements as a share of members who completed training."
            />
            <StatCard
              value={outcomes.pendingPlacements}
              label="Pending placements"
              hint="Placement records awaiting a verified start date."
            />
            <StatCard
              value={outcomes.completedTraining}
              label="Completed training"
              hint="Members who finished their program."
            />
          </div>
        </SectionShell>

        {/* ── 4. Funding mix ── */}
        <SectionShell
          title="Funding mix"
          subtitle="How program enrollments are paid for. Helps show the balance across grants, employers and partners."
        >
          {funding.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.875rem', color: MUTED }}>
              No enrollments with a funding source recorded yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {funding.map((f) => {
                const sharePct = fundingTotal > 0 ? Math.round((f.count / fundingTotal) * 100) : 0;
                return (
                  <div key={f.source}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: '0.35rem',
                        gap: '0.75rem',
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                        {f.label}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: MUTED }}>
                        {f.count.toLocaleString()} ({sharePct}%)
                      </span>
                    </div>
                    <Bar pct={sharePct} color="#3b82f6" />
                  </div>
                );
              })}
            </div>
          )}
        </SectionShell>

        {/* ── 5. Programs ── */}
        <SectionShell
          title="Top programs by enrollment"
          subtitle="Which training tracks members are signing up for most."
        >
          {topPrograms.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.875rem', color: MUTED }}>No program enrollments yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {topPrograms.map((p) => (
                <div key={p.slug}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: '0.35rem',
                      gap: '0.75rem',
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                      {p.title}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                      {p.count.toLocaleString()}
                    </span>
                  </div>
                  <Bar pct={(p.count / programMax) * 100} color="var(--color-accent)" />
                </div>
              ))}
            </div>
          )}
        </SectionShell>
      </div>
    </PortalPageFrame>
  );
}
