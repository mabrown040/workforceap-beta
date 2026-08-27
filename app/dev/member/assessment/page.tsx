import { notFound } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/portal/PageHeader';
import AssessmentForm from '@/components/portal/AssessmentForm';

/**
 * Credential-free Training Preassessment proofs.
 *   /dev/member/assessment              — completed results (the live broken-link case)
 *   /dev/member/assessment?state=locked — intake lock
 *   /dev/member/assessment?state=form   — wizard
 */
export const dynamic = 'force-dynamic';

export default async function DevMemberAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const view = state === 'locked' || state === 'form' ? state : 'completed';

  return (
    <div className="inner-page">
      <div style={{ padding: '1.25rem clamp(1rem, 4vw, 2rem) 1.5rem', borderBottom: '1px solid var(--outline-variant)' }}>
        <PageHeader
          title="Training Preassessment"
          subtitle={
            view === 'completed'
              ? 'On file for you and your counselor.'
              : 'A short skills check before Coursera courses unlock.'
          }
          breadcrumbs={[
            { label: 'Member Portal', href: '/dashboard' },
            { label: 'Training Preassessment' },
          ]}
        />
      </div>
      <section className="content-section">
        <div className="container" style={{ maxWidth: '720px' }}>
          {view === 'completed' ? (
            <div className="portal-card portal-card--flat portal-card--padded">
              <p
                style={{
                  margin: 0,
                  fontSize: 'clamp(2.75rem, 9vw, 3.75rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--wa-text)',
                }}
              >
                82
                <span style={{ marginLeft: '0.12em', fontSize: '0.38em', fontWeight: 700, color: 'var(--wa-muted)' }}>%</span>
              </p>
              <h2 style={{ margin: '0.75rem 0 0.35rem', fontSize: '1.125rem' }}>Preassessment complete</h2>
              <p style={{ color: 'var(--wa-muted)', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
                Finished Aug 12, 2026 · CompTIA A+ Professional Certificate
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <Link href="/dashboard/training" className="btn btn-primary" style={{ minHeight: 44 }}>
                  Continue training
                </Link>
                <Link href="/dashboard" className="btn btn-outline" style={{ minHeight: 44 }}>
                  Dashboard
                </Link>
              </div>
            </div>
          ) : view === 'locked' ? (
            <div className="portal-card portal-card--flat portal-card--padded">
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem' }}>Unlocks after intake</h2>
              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.6, margin: 0 }}>
                Talk with our team first. Then this preassessment personalizes your learning path.
              </p>
            </div>
          ) : (
            <AssessmentForm
              defaultFirstName="Mike"
              defaultLastName="Brown"
              defaultPhone="512-555-0100"
            />
          )}
        </div>
      </section>
    </div>
  );
}
