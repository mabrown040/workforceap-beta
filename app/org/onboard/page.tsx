import LocalizedLink from '@/components/LocalizedLink';

const REQUEST_ACCESS_EMAIL = 'info@workforceap.org';

const onboardingChecks = [
  'Fit for your members or workforce audience',
  'Readiness for rollout, support, and staff coordination',
  'Branding, domain, and implementation needs',
  'Whether WorkforceAP is the right partner for this phase',
];

export default function OrgOnboardPage() {
  return (
    <div
      className="org-onboard"
      style={{
        minHeight: '100vh',
        background: 'var(--color-background-dark, #0a0a12)',
        color: 'var(--color-on-surface, #f2f2f5)',
        padding: '2rem 1rem 4rem',
      }}
    >
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 40 }}>
          <p
            style={{
              margin: '0 0 0.75rem',
              color: 'var(--color-accent, #d4a017)',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Partner onboarding
          </p>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 800, margin: 0 }}>
            WorkforceAP partner onboarding is currently invite-only
          </h1>
          <p
            style={{
              color: 'var(--color-on-surface-muted, rgba(242,242,245,0.72))',
              margin: '1rem auto 0',
              maxWidth: 720,
              lineHeight: 1.7,
              fontSize: 'clamp(1rem, 1.25vw, 1.1rem)',
            }}
          >
            We are working directly with a limited set of nonprofits, workforce teams, and mission-aligned partners.
            If you want to explore WorkforceAP for your organization, request access and we will review fit before any setup or launch.
          </p>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: 24,
            alignItems: 'start',
          }}
        >
          <section
            style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.08)',
              padding: 'clamp(1.5rem, 3vw, 2rem)',
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: '1.3rem' }}>Request access</h2>
            <p style={{ color: 'var(--color-on-surface-muted, rgba(242,242,245,0.72))', lineHeight: 1.7 }}>
              Email us with your organization name, the audience you serve, and what kind of training or workforce support you want to offer.
              We will review the request and follow up with the right next step.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.25rem' }}>
              <a
                href={`mailto:${REQUEST_ACCESS_EMAIL}?subject=WorkforceAP%20partner%20access%20request`}
                className="btn btn-primary btn-large"
                style={{ display: 'inline-flex', fontWeight: 700 }}
              >
                Request access by email
              </a>
              <LocalizedLink
                href="/contact?topic=partnership"
                className="btn btn-secondary btn-large"
                style={{ display: 'inline-flex', fontWeight: 700 }}
              >
                Contact the team
              </LocalizedLink>
            </div>
            <p style={{ margin: '1rem 0 0', fontSize: '0.92rem', color: 'var(--color-on-surface-muted, rgba(242,242,245,0.6))' }}>
              No instant launch. No self-serve checkout. We will confirm readiness before any onboarding moves forward.
            </p>
          </section>

          <section
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.08)',
              padding: 'clamp(1.5rem, 3vw, 2rem)',
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: '1.3rem' }}>What we review first</h2>
            <ul style={{ margin: '1rem 0 0', paddingLeft: '1.1rem', lineHeight: 1.75, color: 'var(--color-on-surface-muted, rgba(242,242,245,0.78))' }}>
              {onboardingChecks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
