'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { trackApplyFunnel } from '@/lib/analytics/events';

const APPLY_STORAGE_KEY = 'apply_eligibility';

const ELIGIBILITY_QUESTIONS = [
  {
    id: 'q1' as const,
    legend: 'Employment status',
    prompt:
      'Are you currently unemployed, working part-time when you want full-time work, or in a job that pays below what your skills or training should command (underemployed)?',
  },
  {
    id: 'q2' as const,
    legend: 'Household income',
    prompt: "Is your household's total annual income below $60,000 before taxes?",
  },
  {
    id: 'q3' as const,
    legend: 'Work authorization',
    prompt:
      'Are you in the United States with permission to work here (for example, U.S. citizen, permanent resident, or other valid work authorization)?',
  },
] as const;

export default function ApplyEligibilityClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const programParam = searchParams.get('program');
  const [q1, setQ1] = useState<'yes' | 'no' | null>(null);
  const [q2, setQ2] = useState<'yes' | 'no' | null>(null);
  const [q3, setQ3] = useState<'yes' | 'no' | null>(null);
  const [attemptedContinue, setAttemptedContinue] = useState(false);
  const completedRef = useRef(false);
  const answeredCountRef = useRef(0);

  const canContinue = q1 !== null && q2 !== null && q3 !== null;
  const yesCount = [q1, q2, q3].filter((answer) => answer === 'yes').length;
  const qualifies = yesCount >= 2;

  useEffect(() => {
    trackApplyFunnel(1, 'started');
    trackApplyFunnel(1, 'eligibility_view');
  }, []);

  useEffect(() => {
    answeredCountRef.current = [q1, q2, q3].filter(Boolean).length;
    trackApplyFunnel(1, 'eligibility_progress', {
      answered_count: answeredCountRef.current,
    });
  }, [q1, q2, q3]);

  useEffect(() => {
    return () => {
      if (!completedRef.current) {
        trackApplyFunnel(1, 'eligibility_dropoff', {
          answered_count: answeredCountRef.current,
        });
      }
    };
  }, []);

  const handleContinue = () => {
    if (!canContinue) {
      setAttemptedContinue(true);
      trackApplyFunnel(1, 'eligibility_continue_blocked', {
        answered_count: [q1, q2, q3].filter(Boolean).length,
      });
      return;
    }

    completedRef.current = true;
    trackApplyFunnel(2, 'qualification_completed', { qualifies, yes_count: yesCount });
    trackApplyFunnel(1, 'eligibility_complete', { qualifies, yes_count: yesCount });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(APPLY_STORAGE_KEY, JSON.stringify({ q1, q2, q3, qualifies, yesCount }));
    }
    const resultsUrl = programParam ? `/apply/results?program=${encodeURIComponent(programParam)}` : '/apply/results';
    router.push(resultsUrl);
  };

  return (
    <div className="apply-flow">
      <div className="apply-progress-bar" aria-label="Application progress">
        <div className="apply-progress-fill" style={{ width: '33%' }} />
        <p className="apply-progress-label">Step 1 of 3 — quick eligibility check</p>
      </div>

      <div className="apply-step-content">
        <p className="apply-step-kicker">About 1 minute • no account required yet</p>
        <h2 className="apply-step-title">Quick check — we want to point you to the best next step</h2>
        <p className="apply-step-desc">
          Answer 3 short questions first. Then you&apos;ll see program options, choose the one you want, and create your account only after that.
        </p>
        <p className="apply-step-desc apply-eligibility-exception-note">
          These questions help us estimate funding fit. They do <strong>not</strong> automatically accept or deny you. If you&apos;re between situations,
          slightly over the threshold, or unsure how to answer, continue anyway — we review real-life circumstances individually, consistent with our{' '}
          <Link href="/faq" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
            FAQ
          </Link>
          .
        </p>

        <div className="apply-transition-card" role="note" aria-label="What happens after this step">
          <strong>What happens next:</strong>
          <span> Step 2 is program selection. Step 3 is account creation so we can save your choice and follow up within 1–2 business days.</span>
        </div>

        <div className="funding-questions">
          <fieldset className="form-group apply-eligibility-fieldset">
            <legend className="apply-eligibility-legend">{ELIGIBILITY_QUESTIONS[0].legend}</legend>
            <p className="apply-eligibility-prompt">{ELIGIBILITY_QUESTIONS[0].prompt}</p>
            <div
              className="form-radio-cards"
              role="group"
              aria-invalid={attemptedContinue && q1 === null}
              aria-describedby={attemptedContinue && q1 === null ? 'apply-eligibility-q1-error' : undefined}
            >
              <label className={`form-radio-card ${q1 === 'yes' ? 'selected' : ''}`}>
                <input type="radio" name="q1" value="yes" checked={q1 === 'yes'} onChange={() => setQ1('yes')} />
                <span className="radio-dot" />
                <span>Yes</span>
              </label>
              <label className={`form-radio-card ${q1 === 'no' ? 'selected' : ''}`}>
                <input type="radio" name="q1" value="no" checked={q1 === 'no'} onChange={() => setQ1('no')} />
                <span className="radio-dot" />
                <span>No</span>
              </label>
            </div>
            {attemptedContinue && q1 === null && (
              <p id="apply-eligibility-q1-error" className="apply-eligibility-field-error" role="alert">
                Choose Yes or No for this question to continue.
              </p>
            )}
          </fieldset>
          <fieldset className="form-group apply-eligibility-fieldset">
            <legend className="apply-eligibility-legend">{ELIGIBILITY_QUESTIONS[1].legend}</legend>
            <p className="apply-eligibility-prompt">{ELIGIBILITY_QUESTIONS[1].prompt}</p>
            <div
              className="form-radio-cards"
              role="group"
              aria-invalid={attemptedContinue && q2 === null}
              aria-describedby={attemptedContinue && q2 === null ? 'apply-eligibility-q2-error' : undefined}
            >
              <label className={`form-radio-card ${q2 === 'yes' ? 'selected' : ''}`}>
                <input type="radio" name="q2" value="yes" checked={q2 === 'yes'} onChange={() => setQ2('yes')} />
                <span className="radio-dot" />
                <span>Yes</span>
              </label>
              <label className={`form-radio-card ${q2 === 'no' ? 'selected' : ''}`}>
                <input type="radio" name="q2" value="no" checked={q2 === 'no'} onChange={() => setQ2('no')} />
                <span className="radio-dot" />
                <span>No</span>
              </label>
            </div>
            {attemptedContinue && q2 === null && (
              <p id="apply-eligibility-q2-error" className="apply-eligibility-field-error" role="alert">
                Choose Yes or No for this question to continue.
              </p>
            )}
          </fieldset>
          <fieldset className="form-group apply-eligibility-fieldset">
            <legend className="apply-eligibility-legend">{ELIGIBILITY_QUESTIONS[2].legend}</legend>
            <p className="apply-eligibility-prompt">{ELIGIBILITY_QUESTIONS[2].prompt}</p>
            <div
              className="form-radio-cards"
              role="group"
              aria-invalid={attemptedContinue && q3 === null}
              aria-describedby={attemptedContinue && q3 === null ? 'apply-eligibility-q3-error' : undefined}
            >
              <label className={`form-radio-card ${q3 === 'yes' ? 'selected' : ''}`}>
                <input type="radio" name="q3" value="yes" checked={q3 === 'yes'} onChange={() => setQ3('yes')} />
                <span className="radio-dot" />
                <span>Yes</span>
              </label>
              <label className={`form-radio-card ${q3 === 'no' ? 'selected' : ''}`}>
                <input type="radio" name="q3" value="no" checked={q3 === 'no'} onChange={() => setQ3('no')} />
                <span className="radio-dot" />
                <span>No</span>
              </label>
            </div>
            {attemptedContinue && q3 === null && (
              <p id="apply-eligibility-q3-error" className="apply-eligibility-field-error" role="alert">
                Choose Yes or No for this question to continue.
              </p>
            )}
          </fieldset>
        </div>

        {canContinue && (
          <div className={`funding-banner ${qualifies ? 'funding-banner-qualify' : 'funding-banner-neutral'}`}>
            {qualifies ? (
              <p>
                <strong>You may be a strong fit for funding support.</strong> Continue to see programs and choose the one you want us to discuss with you.
              </p>
            ) : (
              <p>
                <strong>You may still have options.</strong> Continue to program selection — we&apos;ll still review your situation, suggest a realistic path,
                and follow up personally.
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleContinue}
          aria-describedby={!canContinue || attemptedContinue ? 'apply-eligibility-continue-hint' : undefined}
        >
          Continue to step 2 — choose a program →
        </button>
        {(!canContinue || attemptedContinue) && (
          <p id="apply-eligibility-continue-hint" className="apply-continue-hint" role={attemptedContinue ? 'status' : undefined}>
            {attemptedContinue && !canContinue ? "Please answer all questions to continue. Having trouble? Call (512) 777-1808." : "Answer all three questions above, then continue. If you're unsure, pick the closest option — a counselor can clarify when we follow up."}
          </p>
        )}
      </div>
    </div>
  );
}

export { APPLY_STORAGE_KEY };
