import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getCertificationsCohortStats, cohortLabel } from '@/lib/admin/cohortAnalytics';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import {
  CertificationsQueueKit,
  type CertSubmission,
} from '@/components/portal/kit/pages/admin-subviews/CertificationsQueueKit';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Certificates analytics',
  description: 'Member certificates by cohort.',
  path: '/admin/certifications',
});
}

export default async function AdminCertificationsAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ ui?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/certifications');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const params = await searchParams;
  const requestedUi = typeof params?.ui === 'string' ? params.ui : null;
  // ── Certifications Queue KIT — OPT-IN only (?ui=kit), NOT promoted to default.
  // WorkforceAP has no credential-review workflow: members record certs
  // directly (earned on submit) and there is no pending/verified status, no
  // approve/reject endpoint, and no admin mutation on user_certifications.
  // So we wire the kit to REAL data (the most recently recorded credentials —
  // the only real "submission" stream that exists) but keep the approve/reject
  // controls disabled (`actionsEnabled={false}`) rather than fake a backend.
  if (requestedUi === 'kit') {
    const recent = await prisma.userCertification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        certName: true,
        createdAt: true,
        user: { select: { fullName: true, email: true, enrolledProgram: true } },
      },
    });

    const submissions: CertSubmission[] = recent.map((c) => ({
      id: c.id,
      credential: c.certName,
      member: c.user.fullName ?? c.user.email ?? 'Unknown member',
      meta: `${cohortLabel(c.user.enrolledProgram)} · recorded ${c.createdAt.toLocaleDateString(
        'en-US',
        { month: 'short', day: 'numeric', year: 'numeric' },
      )}`,
      // No admin-side endpoint exists to sign the proof file (cert-files/{userId}/{certId}.{ext}
      // in the member-files bucket), and we may not add API routes here, so we
      // can't surface a real proof URL. Leave undefined → kit shows "No proof".
      proofHref: undefined,
    }));

    return (
      <CertificationsQueueKit
        submissions={submissions}
        awaitingCount={submissions.length}
        actionsEnabled={false}
        subtitle="Most recently recorded credentials. Members log certs directly — there is no review/verification step yet."
      />
    );
  }

  const [rows, recentCerts] = await Promise.all([
    getCertificationsCohortStats(),
    prisma.userCertification.findMany({
      orderBy: { earnedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        certName: true,
        earnedAt: true,
        user: { select: { fullName: true, email: true, enrolledProgram: true } },
      },
    }),
  ]);

  const totalCerts = rows.reduce((s, r) => s + r.totalCerts, 0);
  const totalMembers = rows.reduce((s, r) => s + r.membersWithCert, 0);
  const topCohort = rows.reduce((best, r) => (r.totalCerts > (best?.totalCerts ?? 0) ? r : best), rows[0]);

  return (
    <div>
      <PageHeader
        title="Certificates Analytics"
        subtitle="Earned credentials by program cohort."
      />

      {/* Summary metric strip */}
      <div className="portal-metric-strip" style={{ marginBottom: '1.5rem' }}>
        <div className="portal-metric-card">
          <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--accent">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
          </div>
          <p className="portal-metric-card__value">{totalCerts}</p>
          <p className="portal-metric-card__label">Total Certificates</p>
        </div>
        <div className="portal-metric-card">
          <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--green">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>groups</span>
          </div>
          <p className="portal-metric-card__value">{totalMembers}</p>
          <p className="portal-metric-card__label">Members with Certs</p>
        </div>
        <div className="portal-metric-card">
          <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--gold">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>school</span>
          </div>
          <p className="portal-metric-card__value">{rows.length}</p>
          <p className="portal-metric-card__label">Programs</p>
        </div>
        {topCohort && (
          <div className="portal-metric-card">
            <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--blue">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>military_tech</span>
            </div>
            <p className="portal-metric-card__value">{topCohort.totalCerts}</p>
            <p className="portal-metric-card__label" title={topCohort.cohortLabel}>Top Cohort</p>
          </div>
        )}
      </div>

      {/* Cohort cards */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="portal-dash-section-header" style={{ marginBottom: '0.875rem' }}>
          <h2 className="portal-heading-with-bar portal-section-heading" style={{ margin: 0 }}>By Program Cohort</h2>
        </div>
        {rows.length === 0 ? (
          <p style={{ color: 'var(--color-on-surface-variant)' }}>No certificate data yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {rows.map((r) => {
              const pct = r.memberCount > 0 ? Math.round((r.membersWithCert / r.memberCount) * 100) : 0;
              return (
                <div key={r.cohortKey} className="portal-card portal-card--flat" style={{ padding: '1rem 1.125rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)', margin: '0 0 0.5rem' }}>
                        {r.cohortLabel}
                      </p>
                      <div className="portal-progress-bar portal-progress-bar--thin" style={{ marginBottom: '0.375rem' }}>
                        <div className="portal-progress-bar__fill" style={{ width: `${pct}%` }} />
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                        {r.membersWithCert} of {r.memberCount} members earned certs ({pct}%)
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', flexShrink: 0, textAlign: 'center' }}>
                      <div>
                        <p style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-accent)', margin: 0, lineHeight: 1 }}>{r.totalCerts}</p>
                        <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', margin: '0.2rem 0 0' }}>Certs</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-on-surface)', margin: 0, lineHeight: 1 }}>{r.memberCount}</p>
                        <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', margin: '0.2rem 0 0' }}>Members</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent certificates */}
      {recentCerts.length > 0 && (
        <div>
          <div className="portal-dash-section-header" style={{ marginBottom: '0.875rem' }}>
            <h2 className="portal-heading-with-bar portal-section-heading" style={{ margin: 0 }}>Recent Certificates</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentCerts.map((c) => {
              const initials = (c.user.fullName ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={c.id} className="portal-activity-item">
                  <div style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-on-surface)', margin: 0 }}>{c.user.fullName}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-accent)', margin: '0.1rem 0 0', fontWeight: 600 }}>{c.certName}</p>
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)', flexShrink: 0 }}>
                    {c.earnedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
