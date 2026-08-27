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
              ? 'Your snapshot is on file. Use it with your counselor and keep training.'
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
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem' }}>Preassessment complete</h2>
              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.6, margin: '0 0 1rem' }}>
                Score 82%. Finished Aug 12, 2026. Program of interest: CompTIA A+ Professional Certificate.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <Link href="/dashboard/training" className="btn btn-primary">
                  Continue training
                </Link>
                <Link href="/dashboard" className="btn btn-outline">
                  Back to dashboard
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
