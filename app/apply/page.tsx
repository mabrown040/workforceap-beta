import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CheckCircle, ClipboardList, UserPlus, Clock } from 'lucide-react';
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
          
          <div
            className="apply-hero-no-cost-callout"
            style={{ marginBottom: '2rem', maxWidth: '600px' }}
          >
            <p style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              <strong>✓ No cost to members.</strong>
            </p>
            <p style={{ fontSize: '0.95rem', margin: '0.35rem 0 0' }}>
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
              { Icon: CheckCircle, text: 'Quick eligibility check', label: 'Step 1' },
              { Icon: ClipboardList, text: 'Choose a program', label: 'Step 2' },
              { Icon: UserPlus, text: 'Create your account', label: 'Step 3' },
              { Icon: Clock, text: 'We respond within 24–48 hours', label: 'Timeline' }
            ].map((step) => (
              <div key={step.text} style={{
                padding: '0.85rem 1.1rem',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem'
              }}>
                <step.Icon size={20} strokeWidth={2.5} aria-label={step.label} style={{ flexShrink: 0, opacity: 0.9 }} />
                <span>{step.text}</span>
              </div>
            ))}
          </div>

          <div style={{
            padding: '1rem 1.25rem',
            background: 'rgba(240, 205, 131, 0.2)',
            border: '1px solid rgba(240, 205, 131, 0.4)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            maxWidth: '700px'
          }}>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
              <strong>Where we operate today:</strong> We&apos;re currently serving the Austin area. 
              This is our launch community — we&apos;re building toward expansion. 
              If you&apos;re elsewhere, apply anyway; we&apos;ll keep you in the loop.
            </p>
          </div>

          <p style={{ fontSize: '0.95rem', marginBottom: '0' }}>
            <strong>Questions before you start?</strong> Call us: <a href="tel:5127771808" style={{ color: 'var(--color-gold)', fontWeight: 700, textDecoration: 'underline' }}>(512) 777-1808</a>
          </p>
        </div>
      </section>

      <section className="content-section" style={{ paddingTop: '3rem' }}>
        <div className="container">
          <div
            className="expectations-box"
            style={{
              padding: '2rem 2.5rem',
              border: '2px solid var(--color-accent)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '2rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
            }}
            aria-labelledby="apply-expectations-heading"
          >
            <h3 id="apply-expectations-heading" style={{ 
              fontSize: '1.5rem', 
              fontWeight: 700, 
              marginBottom: '1.5rem',
              color: 'var(--color-primary)',
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
            background: 'rgba(173, 44, 77, 0.06)',
            border: '1px solid rgba(173, 44, 77, 0.2)',
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

          <Suspense fallback={<div style={{ padding: '1rem', color: 'var(--color-gray-600)' }}>Loading...</div>}>
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
