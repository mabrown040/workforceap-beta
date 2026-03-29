import type { Metadata } from 'next';
import { Suspense } from 'react';
import Footer from '@/components/Footer';
import ApplyEligibilityClient from './ApplyEligibilityClient';
import ApplyPageSkeleton from './ApplyPageSkeleton';
import ApplyProgramIntro from '@/components/apply/ApplyProgramIntro';
import ApplyRefCapture from '@/components/apply/ApplyRefCapture';
import { buildApplyPageMetadata, getProgramBySlug, resolveApplyProgramSlug } from '@/lib/apply/applyProgramPage';

type PageProps = { searchParams?: Promise<{ program?: string }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = searchParams ? await searchParams : {};
  return buildApplyPageMetadata(sp.program);
}

export default async function ApplyPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const programSlug = resolveApplyProgramSlug(sp.program);
  const program = programSlug ? getProgramBySlug(programSlug) : undefined;

  return (
    <div className="inner-page">
      <section className="page-hero apply-hero">
        <div className="page-hero-content">
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 800, marginBottom: '1rem' }}>
            Start your application
          </h1>
          <p style={{ fontSize: 'clamp(1.05rem, 2.5vw, 1.2rem)', lineHeight: 1.6, marginBottom: '1.5rem', maxWidth: '650px' }}>
            Answer 3 quick questions, choose a program, then create your account so we can follow up with your next steps. 
            <strong> No experience required.</strong>
          </p>
          
          <div style={{
            padding: '1.25rem 1.5rem',
            background: 'var(--surface-container-low)',
            border: '2px solid var(--color-accent)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '2rem',
            maxWidth: '600px'
          }}>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>
              ✓ No cost to members.
            </p>
            <p style={{ fontSize: '0.95rem', margin: '0.35rem 0 0', color: 'var(--color-on-surface-variant)' }}>
              Training and support are provided at no charge to qualifying participants.
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gap: '0.75rem', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            marginBottom: '2rem',
            maxWidth: '900px'
          }}>
            {[
              { icon: 'check_circle', text: 'Quick eligibility check', label: 'Step 1' },
              { icon: 'checklist', text: 'Choose a program', label: 'Step 2' },
              { icon: 'person_add', text: 'Create your account', label: 'Step 3' },
              { icon: 'schedule', text: 'We respond within 24–48 hours', label: 'Timeline' }
            ].map((step) => (
              <div key={step.text} style={{
                padding: '0.85rem 1.1rem',
                background: 'var(--surface-container-low)',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem'
              }}>
                <span className="material-symbols-outlined" aria-label={step.label} style={{ fontSize: 20, flexShrink: 0, opacity: 0.9 }}>{step.icon}</span>
                <span>{step.text}</span>
              </div>
            ))}
          </div>

          <div style={{
            padding: '1rem 1.25rem',
            background: 'var(--surface-container)',
            border: '1px solid var(--surface-container-highest)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            maxWidth: '700px'
          }}>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
              <strong>Where we operate:</strong> We serve communities across the country and are building toward national scale.
              Apply from anywhere — we&apos;ll connect you with the right program.
            </p>
          </div>

          <p style={{ fontSize: '0.95rem', marginBottom: '0' }}>
            <strong>Questions before you start?</strong> Call us: <a href="tel:5127771808" style={{ color: 'var(--color-gold)', fontWeight: 700, textDecoration: 'underline' }}>(512) 777-1808</a>
          </p>
        </div>
      </section>

      <section className="content-section" style={{ paddingTop: '3rem' }}>
        <div className="container">
          <div style={{
            padding: '2rem 2.5rem',
            background: 'var(--surface-container-low)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '2rem',
          }} aria-labelledby="apply-expectations-heading">
            <h3 id="apply-expectations-heading" style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '1.5rem',
              color: 'var(--color-on-surface)',
              textAlign: 'center'
            }}>
              What happens after you apply?
            </h3>
            <ol style={{
              display: 'grid',
              gap: '1.25rem',
              listStyle: 'none',
              padding: 0,
              counterReset: 'step-counter'
            }}>
              {[
                'We review your application within 24–48 hours',
                'Schedule an overview call with a counselor',
                'Complete a brief skills assessment (not a test — helps us match you)',
                '30-minute interview to confirm mutual fit',
                'Start your program — at no cost to you'
              ].map((step, idx) => (
                <li key={idx} style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  fontSize: '1.05rem',
                  lineHeight: 1.6
                }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--color-accent)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ paddingTop: '0.25rem' }}>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div style={{
            padding: '1.5rem 2rem',
            background: 'var(--surface-container)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '2rem',
            fontSize: '0.95rem',
            lineHeight: 1.7
          }} role="note">
            <p style={{ margin: 0 }}>
              <strong style={{ color: 'var(--color-accent)', fontSize: '1rem' }}>What to expect:</strong> This intake starts with a short eligibility check before account creation, 
              so you can see your likely options first. After you create an account, a counselor reviews your selection 
              and follows up within 24–48 hours.
            </p>
          </div>

          {program ? <ApplyProgramIntro programSlug={program.slug} /> : null}

          <Suspense fallback={<div style={{ padding: '1rem', color: 'var(--color-on-surface-variant)' }}>Loading...</div>}>
            <ApplyRefCapture />
          </Suspense>
          <Suspense fallback={<ApplyPageSkeleton />}>
            <ApplyEligibilityClient />
          </Suspense>
        </div>
      </section>

      <Footer />
    </div>
  );
}
