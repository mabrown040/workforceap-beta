'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PROGRAMS, getProgramBySlug } from '@/lib/content/programs';
import { APPLY_STORAGE_KEY } from '../ApplyEligibilityClient';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ProgramIcon } from '@/components/ProgramIcon';
import { trackApplyFunnel } from '@/lib/analytics/events';

const PROGRAM_STORAGE_KEY = 'apply_program_slug';

export default function ApplyResultsClient() {
  const searchParams = useSearchParams();
  const programParam = searchParams.get('program');
  const [pageState, setPageState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [qualifies, setQualifies] = useState<boolean | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string>(programParam ?? '');
  const continuedRef = useRef(false);
  const qualifiesRef = useRef<boolean | null>(null);
  const selectedSlugRef = useRef('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = sessionStorage.getItem(APPLY_STORAGE_KEY);
      if (!stored) {
        trackApplyFunnel(2, 'results_missing_prereq');
        setPageState('missing');
        return;
      }
      const data = JSON.parse(stored) as { qualifies?: boolean };
      setQualifies(data.qualifies === true);
      if (programParam && getProgramBySlug(programParam)) {
        setSelectedSlug(programParam);
      }
      setPageState('ready');
    } catch {
      trackApplyFunnel(2, 'results_missing_prereq');
      setPageState('missing');
    }
  }, [programParam]);

  useEffect(() => {
    if (pageState !== 'ready' || qualifies === null) return;
    trackApplyFunnel(2, 'results_view', { qualifies });
  }, [qualifies, pageState]);

  useEffect(() => {
    qualifiesRef.current = qualifies;
    selectedSlugRef.current = selectedSlug;
  }, [qualifies, selectedSlug]);

  useEffect(() => {
    return () => {
      if (pageState === 'ready' && !continuedRef.current) {
        trackApplyFunnel(2, 'results_dropoff', {
          qualifies: qualifiesRef.current,
          selected_program_slug: selectedSlugRef.current || null,
        });
      }
    };
  }, [pageState]);

  const handleContinue = () => {
    if (!selectedSlug) {
      trackApplyFunnel(2, 'program_continue_blocked');
      return;
    }
    continuedRef.current = true;
    trackApplyFunnel(2, 'program_selected', { program_slug: selectedSlug, qualifies });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(PROGRAM_STORAGE_KEY, selectedSlug);
    }
    window.location.href = '/apply/create-account';
  };

  const programsOrdered =
    qualifies === true
      ? PROGRAMS
      : [...PROGRAMS].sort((a, b) => {
          const dig = 'digital-literacy-empowerment-class';
          if (a.slug === dig) return -1;
          if (b.slug === dig) return 1;
          return 0;
        });

  if (pageState === 'loading') {
    return (
      <div className="apply-flow">
        <div className="apply-progress-bar">
          <div className="skeleton" style={{ height: 6, borderRadius: 3, width: '66%' }} />
        </div>
        <div className="apply-step-content" style={{ marginTop: '1.5rem' }}>
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (pageState === 'missing') {
    return (
      <div className="apply-flow">
        <div className="apply-progress-bar">
          <div className="apply-progress-fill" style={{ width: '66%' }} />
          <p className="apply-progress-label">Step 2 of 3 — choose a program</p>
        </div>
        <div className="apply-step-content apply-missing-session">
          <h2 className="apply-step-title">We need your answers from step 1 first</h2>
          <p className="apply-step-desc">
            This page works after the quick eligibility check. If you opened this page directly, switched devices, or cleared browser data,
            we may not have your step 1 answers anymore.
          </p>
          <p style={{ marginBottom: '1.25rem' }}>
            <Link href="/apply" className="btn btn-primary">
              Go to step 1 — quick eligibility check
            </Link>
          </p>
          <p className="apply-step-desc" style={{ fontSize: '0.9rem' }}>
            Already did step 1 in this browser? Return to <Link href="/apply">/apply</Link> and answer the 3 questions again — it only takes about a minute.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="apply-flow">
      <div className="apply-progress-bar">
        <div className="apply-progress-fill" style={{ width: '66%' }} />
        <p className="apply-progress-label">Step 2 of 3 — choose your program</p>
      </div>

      <div className="apply-step-content">
        <p className="apply-step-back-nav">
          <Link href="/apply">← Back to step 1 — eligibility</Link>
        </p>
        <p className="apply-step-kicker">About 2 minutes • still no account required</p>
        <div className="apply-transition-card" role="note" aria-label="What happens after program selection">
          <strong>Before you continue:</strong>
          <span> choosing a program does not lock you in forever. It tells us what you want to discuss first. After this, you&apos;ll create your account so we can save your choice and follow up.</span>
        </div>
        {qualifies ? (
          <>
            <div className={`funding-banner funding-banner-qualify`} style={{ marginBottom: '1.5rem' }}>
              <p>
                <strong>Looks like a strong funding fit.</strong> Pick the program you want most, then create your account so a counselor can confirm next steps within 24–48 hours.
              </p>
            </div>
            <h2 className="apply-step-title">Which program are you most interested in right now?</h2>
            <p className="apply-results-program-hint">Choose one now — if your goals change, a counselor can still help you compare options later.</p>
          </>
        ) : (
          <>
            <div className="apply-results-anyway" style={{ marginBottom: '1rem', padding: '1rem 1.25rem', background: 'var(--color-light)', border: '1px solid var(--color-gray-200)', borderRadius: '8px' }}>
              <p style={{ margin: 0 }}>
                <strong>Your answers don&apos;t match our standard funding profile right now.</strong> That is not a final decision. We still review every application,
                suggest realistic next steps, and often start people with foundational options while we sort out timing and support.
              </p>
            </div>
            <section className="apply-foundational-support" aria-labelledby="apply-foundational-heading">
              <h2 id="apply-foundational-heading" className="apply-foundational-support__title">
                Start with support, not a dead end
              </h2>
              <ul className="apply-foundational-support__list">
                <li>
                  <strong>Digital foundations:</strong> Uncomfortable with computers or online forms? Our{' '}
                  <Link href="/programs/digital-literacy-empowerment-class">Digital Literacy Empowerment Class</Link> is listed first below.
                </li>
                <li>
                  <strong>Not sure what fits?</strong> Take the <Link href="/find-your-path">2-minute pathfinder</Link> for ranked ideas.
                </li>
                <li>
                  <strong>Want a person to help?</strong> <Link href="/contact">Contact us</Link> or call <a href="tel:+15127771808">(512) 777-1808</a>.
                </li>
              </ul>
            </section>
            <h2 className="apply-step-title">Which program should we start with?</h2>
            <p className="apply-results-program-hint">Pick one to continue. We&apos;ll save it as your starting point, not your final commitment.</p>
          </>
        )}

        <div
          className="apply-results-program-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
            marginTop: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          {programsOrdered.map((p) => (
            <div
              key={p.slug}
              className="apply-results-program-card"
              onClick={() => setSelectedSlug(p.slug)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedSlug(p.slug);
                }
              }}
              aria-pressed={selectedSlug === p.slug}
              style={{
                padding: '1.25rem',
                border: selectedSlug === p.slug ? '2px solid var(--color-accent)' : '1px solid var(--color-gray-200)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                background:
                  selectedSlug === p.slug ? 'rgba(74, 155, 79, 0.08)' : 'var(--color-white)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span
                  style={{
                    background: p.categoryColor,
                    color: 'white',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '50px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {p.categoryLabel}
                </span>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <ProgramIcon program={p} size={24} />
                </span>
              </div>
              <p className="apply-results-program-card-title">{p.title}</p>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>
                <div>⏱ {p.duration}</div>
                <div style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{p.salary}</div>
              </div>
            </div>
          ))}
        </div>

        {!selectedSlug && (
          <p className="apply-continue-hint" role="alert">
            Select one program to continue. If you&apos;re undecided, choose the one you want to discuss first — your counselor can help you compare options.
          </p>
        )}

        <button type="button" className="btn btn-primary" disabled={!selectedSlug} onClick={handleContinue}>
          Continue to step 3 — create your account →
        </button>
      </div>
    </div>
  );
}
