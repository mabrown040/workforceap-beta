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
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Start your application</h1>
          <p>
            Answer 3 quick questions, choose a program, then create your account so we can follow up with your next steps. No
            experience required.
          </p>
          <p className="apply-hero-no-cost-callout" role="note">
            <strong>No cost to members.</strong> Training and support are provided at no charge to qualifying participants.
          </p>
          <div className="hero-badges">
            {['Step 1: quick eligibility check', 'Step 2: choose a program', 'Step 3: create your account', 'We respond within 24–48 hours'].map(
              (t) => (
                <span key={t} className="hero-badge-item">
                  &#10003; {t}
                </span>
              )
            )}
          </div>
          <p className="apply-eligibility-note apply-location-callout">
            <strong>Where we operate today:</strong> We&apos;re currently serving the Austin area. This is our launch community — we&apos;re
            building toward expansion. If you&apos;re elsewhere, apply anyway; we&apos;ll keep you in the loop.
          </p>
          <p className="hero-cta-note">
            Questions before you start? Call us: <a href="tel:5127771808">(512) 777-1808</a>
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div className="expectations-box" aria-labelledby="apply-expectations-heading">
            <h3 id="apply-expectations-heading">What happens after you apply?</h3>
            <ol>
              <li>We review your application within 24–48 hours</li>
              <li>Schedule an overview call with a counselor</li>
              <li>Complete a brief skills assessment (not a test — helps us match you)</li>
              <li>30-minute interview to confirm mutual fit</li>
              <li>Start your program — at no cost to you</li>
            </ol>
          </div>

          <div className="apply-info-banner" role="note">
            <strong>What to expect:</strong> this intake starts with a short eligibility check before account creation, so you can see your
            likely options first. After you create an account, a counselor reviews your selection and follows up within 24–48 hours.
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
