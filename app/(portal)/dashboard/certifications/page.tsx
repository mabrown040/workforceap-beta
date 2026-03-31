import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import CertificationRoadmap from '@/components/portal/CertificationRoadmap';
import CertificationReferenceSection from '@/components/portal/CertificationReferenceSection';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Certifications & Achievements — The Verification Vault',
  description: 'Track credentials, download certificates, and follow your certification roadmap.',
  path: '/dashboard/certifications',
});

export default async function DashboardCertificationsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/certifications');

  return (
    <>
      {/* ── MOBILE ── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1rem 0.5rem' }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.25, marginBottom: '0.25rem' }}>
            Verification Vault
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
            Your credentials and certification progress.
          </p>
        </div>

        {/* Stats chips */}
        <div style={{ display: 'flex', gap: '0.625rem', padding: '0.75rem 1rem', overflowX: 'auto' }}>
          {[
            { icon: 'workspace_premium', label: '9 Credentials', color: 'var(--color-accent)', bg: 'rgba(173,44,77,0.12)' },
            { icon: 'trending_up', label: '67% Progress', color: 'var(--color-blue)', bg: 'rgba(43,123,185,0.12)' },
            { icon: 'verified', label: 'Industry Verified', color: 'var(--color-green)', bg: 'rgba(74,155,79,0.12)' },
          ].map((chip) => (
            <div
              key={chip.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                background: chip.bg,
                borderRadius: '999px',
                padding: '0.375rem 0.75rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1rem', color: chip.color, fontVariationSettings: "'FILL' 1" }}
              >
                {chip.icon}
              </span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: chip.color }}>{chip.label}</span>
            </div>
          ))}
        </div>

        {/* Earned Certifications */}
        <section style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Earned</h2>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>3 certs</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {[
              { icon: 'cloud', name: 'Cloud Fundamentals', issuer: 'CompTIA', date: 'Jan 2024' },
              { icon: 'security', name: 'Security Essentials', issuer: 'CompTIA', date: 'Mar 2024' },
              { icon: 'health_and_safety', name: 'CPR & First Aid', issuer: 'Red Cross', date: 'Feb 2024' },
            ].map((cert) => (
              <div
                key={cert.name}
                style={{
                  background: 'var(--surface-container)',
                  borderRadius: '0.875rem',
                  padding: '0.875rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                }}
              >
                <div
                  style={{
                    background: 'rgba(74,155,79,0.12)',
                    borderRadius: '0.625rem',
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '1.375rem', color: 'var(--color-green)', fontVariationSettings: "'FILL' 1" }}
                  >
                    {cert.icon}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cert.name}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                    {cert.issuer} · {cert.date}
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    background: 'var(--color-accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* In Progress */}
        <section style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.75rem' }}>In Progress</h2>
          <div
            style={{
              background: 'var(--surface-container)',
              borderRadius: '0.875rem',
              padding: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.875rem' }}>
              <div
                style={{
                  background: 'rgba(43,123,185,0.12)',
                  borderRadius: '0.625rem',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '1.375rem', color: 'var(--color-blue)', fontVariationSettings: "'FILL' 1" }}
                >
                  storage
                </span>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Data &amp; Storage</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>CompTIA · 4 of 6 modules</div>
              </div>
            </div>
            {/* SVG Progress bar */}
            <div style={{ position: 'relative', height: '8px', borderRadius: '999px', overflow: 'hidden', background: 'var(--surface-container-highest)' }}>
              <svg width="100%" height="8" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
                <rect x="0" y="0" width="67%" height="8" rx="4" fill="var(--color-blue)" />
              </svg>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>67% complete</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Est. 2 weeks</span>
            </div>
          </div>
        </section>

        {/* Earn More CTA */}
        <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, var(--color-accent) 0%, rgba(173,44,77,0.8) 100%)',
              borderRadius: '1rem',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '2rem', color: '#fff', fontVariationSettings: "'FILL' 1" }}
            >
              emoji_events
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem', marginBottom: '0.25rem' }}>Earn More Credentials</div>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)', marginBottom: '0.625rem' }}>
                Browse available certifications in your program pathway.
              </div>
              <a
                href="/dashboard/learning"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: '#fff',
                  color: 'var(--color-accent)',
                  borderRadius: '0.5rem',
                  padding: '0.375rem 0.875rem',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  textDecoration: 'none',
                }}
              >
                View Pathway
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_forward</span>
              </a>
            </div>
          </div>
        </div>

        <MobileBottomNav variant="portal" />
      </div>

      {/* ── DESKTOP ── */}
      <div className="wa-hidden wa-md:wa-block">
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-on-surface-variant)',
              marginBottom: 'var(--space-6)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <a href="/dashboard" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>Member Portal</a>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_right</span>
            <span>Certifications &amp; Achievements</span>
          </nav>

          {/* Page heading */}
          <header style={{ marginBottom: 'var(--space-8)' }}>
            <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 'var(--font-weight-bold)', lineHeight: 'var(--line-height-tight)', marginBottom: 'var(--space-2)' }}>
              The Verification Vault
            </h1>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-size-base)', maxWidth: '640px' }}>
              Your credentials, milestones, and industry verifications in one place. Track progress across WorkforceAP certification pathways and download proof of achievement.
            </p>
          </header>

          {/* 3-column stats bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 'var(--space-4)',
              marginBottom: 'var(--space-8)',
            }}
          >
            {/* Total Credentials */}
            <div
              style={{
                background: 'var(--surface-container)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-6)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '2rem',
                  color: 'var(--color-accent)',
                  background: 'rgba(173,44,77,0.12)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-3)',
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                workspace_premium
              </span>
              <div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>Total Credentials</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 'var(--font-weight-bold)' }}>9</div>
              </div>
            </div>

            {/* Program Progress */}
            <div
              style={{
                background: 'var(--surface-container)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-6)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '2rem',
                    color: 'var(--color-blue)',
                    background: 'rgba(43,123,185,0.12)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-3)',
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  trending_up
                </span>
                <div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>Program Progress</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'var(--font-weight-bold)' }}>67%</div>
                </div>
              </div>
              <div style={{ height: '6px', background: 'var(--surface-container-highest)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '67%', background: 'var(--color-blue)', borderRadius: 'var(--radius-full)', transition: 'var(--transition-base)' }} />
              </div>
            </div>

            {/* Industry Verified */}
            <div
              style={{
                background: 'var(--surface-container)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-6)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '2rem',
                  color: 'var(--color-green)',
                  background: 'rgba(74,155,79,0.12)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-3)',
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                verified
              </span>
              <div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>Industry Verified</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-1)', fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>
                  <span style={{ fontWeight: 600 }}>CompTIA</span>
                  <span style={{ opacity: 0.4 }}>|</span>
                  <span style={{ fontWeight: 600 }}>Red Cross</span>
                  <span style={{ opacity: 0.4 }}>|</span>
                  <span style={{ fontWeight: 600 }}>OSHA</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main bento grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: 'var(--space-4)',
              marginBottom: 'var(--space-12)',
            }}
          >
            {/* Active Pathway card (large) */}
            <div
              style={{
                background: 'var(--surface-container-low)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-8)',
                gridRow: 'span 2',
                border: '1px solid var(--outline-variant)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '1.5rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}
                >
                  route
                </span>
                <h2 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>Active Pathway</h2>
              </div>
              <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-sm)' }}>
                Your current certification journey. Complete each milestone to unlock the next.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {[
                  { icon: 'cloud', label: 'Cloud Fundamentals', status: 'complete' as const },
                  { icon: 'security', label: 'Security Essentials', status: 'complete' as const },
                  { icon: 'storage', label: 'Data & Storage', status: 'current' as const },
                  { icon: 'admin_panel_settings', label: 'Governance & Compliance', status: 'locked' as const },
                ].map((milestone) => (
                  <div
                    key={milestone.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-4)',
                      padding: 'var(--space-4)',
                      borderRadius: 'var(--radius-lg)',
                      background: milestone.status === 'current'
                        ? 'rgba(173,44,77,0.08)'
                        : milestone.status === 'complete'
                          ? 'rgba(74,155,79,0.06)'
                          : 'var(--surface-container)',
                      border: milestone.status === 'current' ? '1px solid var(--color-accent)' : '1px solid transparent',
                      opacity: milestone.status === 'locked' ? 0.5 : 1,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '1.5rem',
                        color: milestone.status === 'complete'
                          ? 'var(--color-green)'
                          : milestone.status === 'current'
                            ? 'var(--color-accent)'
                            : 'var(--color-on-surface-variant)',
                        fontVariationSettings: milestone.status === 'complete' ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      {milestone.status === 'complete' ? 'check_circle' : milestone.status === 'locked' ? 'lock' : milestone.icon}
                    </span>
                    <div>
                      <div style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-base)' }}>{milestone.label}</div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>
                        {milestone.status === 'complete' && 'Completed'}
                        {milestone.status === 'current' && 'In progress'}
                        {milestone.status === 'locked' && 'Locked'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ready for Download card */}
            <div
              style={{
                background: 'var(--surface-container)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-6)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>
                  download
                </span>
                <h3 style={{ fontSize: 'var(--font-size-h4)', fontWeight: 'var(--font-weight-medium)', margin: 0 }}>Ready for Download</h3>
              </div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                Your earned certificates are ready to download as PDF.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  alignSelf: 'flex-start',
                  padding: '0.6rem 1.25rem',
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>picture_as_pdf</span>
                Download All (PDF)
              </button>
            </div>

            {/* Achievement badge with SVG ring */}
            <div
              style={{
                background: 'var(--surface-container)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-6)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
                <circle cx="48" cy="48" r="42" stroke="var(--surface-container-highest)" strokeWidth="4" opacity="0.3" />
                <circle cx="48" cy="48" r="42" stroke="var(--color-gold)" strokeWidth="4" strokeDasharray="264" strokeDashoffset="88" strokeLinecap="round" transform="rotate(-90 48 48)" />
                <text x="48" y="45" textAnchor="middle" fill="var(--color-gold)" fontSize="22" fontWeight="700">67%</text>
                <text x="48" y="62" textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize="10">of goal</text>
              </svg>
              <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>Pathway Badge</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>Earn 3 more to unlock Gold</div>
            </div>
          </div>

          {/* Certification Roadmap section */}
          <section style={{ marginBottom: 'var(--space-12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>
                timeline
              </span>
              <h2 style={{ fontSize: 'var(--font-size-h2)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>Certification Roadmap</h2>
            </div>
            <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-6)', maxWidth: '640px' }}>
              Industry-recognized credentials across IT, healthcare, and skilled trades. Check off certifications as you earn them.
            </p>

            <CertificationReferenceSection />

            <div style={{ maxWidth: '860px' }}>
              <CertificationRoadmap />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
