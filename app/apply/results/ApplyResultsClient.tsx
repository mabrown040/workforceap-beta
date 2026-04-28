'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PROGRAMS, getProgramBySlug, type Program } from '@/lib/content/programs';
import { APPLY_STORAGE_KEY } from '../ApplyEligibilityClient';
import { APPLY_PROGRAM_SLUG_KEY, APPLY_PROGRAM_RANKED_KEY } from '@/lib/apply/applyProgramStorage';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ProgramIcon } from '@/components/ProgramIcon';
import { trackApplyFunnel } from '@/lib/analytics/events';

const FYP_RESULTS_KEY = 'find_your_path_results';

type CareerMatchPayload = {
  version?: number;
  programSlugs?: string[];
  careerMatch?: { recommendedPrograms?: { programSlug: string }[] } | null;
};

function toggleSlug(list: string[], slug: string, max: number): string[] {
  const i = list.indexOf(slug);
  if (i >= 0) return list.filter((s) => s !== slug);
  if (list.length < max) return [...list, slug];
  return list;
}

export default function ApplyResultsClient() {
  const searchParams = useSearchParams();
  const programParam = searchParams.get('program');
  const [pageState, setPageState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [qualifies, setQualifies] = useState<boolean | null>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  /** From Find Your Path v1 localStorage — used to label + order cards. */
  const [quizRecommendedSlugs, setQuizRecommendedSlugs] = useState<string[]>([]);
  const continuedRef = useRef(false);
  const qualifiesRef = useRef<boolean | null>(null);
  const selectedSlugsRef = useRef<string[]>([]);

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

      const explicitSlug = programParam && getProgramBySlug(programParam) ? programParam : null;
      let initial: string[] = explicitSlug ? [explicitSlug] : [];
      try {
        const fyp = localStorage.getItem(FYP_RESULTS_KEY);
        if (fyp) {
          const parsed = JSON.parse(fyp) as CareerMatchPayload | string[] | unknown;
          let fromQuiz: string[] = [];
          if (
            parsed &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed) &&
            'version' in parsed &&
            Array.isArray((parsed as CareerMatchPayload).programSlugs)
          ) {
            const v1 = parsed as CareerMatchPayload;
            fromQuiz = v1.programSlugs!
              .map((s) => (typeof s === 'string' ? s : null))
              .filter((s): s is string => !!s && !!getProgramBySlug(s))
              .slice(0, 3);
            if (fromQuiz.length) setQuizRecommendedSlugs(fromQuiz);
          } else if (Array.isArray(parsed)) {
            fromQuiz = parsed
              .map((s) => (typeof s === 'string' ? s : null))
              .filter((s): s is string => !!s && !!getProgramBySlug(s))
              .slice(0, 3);
          }
          if (fromQuiz.length) {
            // Explicit ?program= must stay as the 1st choice. Quiz recs only
            // fill remaining slots (up to 3 total) without overriding it.
            if (explicitSlug) {
              const rest = fromQuiz.filter((s) => s !== explicitSlug);
              initial = [explicitSlug, ...rest].slice(0, 3);
            } else {
              initial = fromQuiz;
            }
          }
        }
      } catch {
        /* ignore */
      }

      if (initial.length) setSelectedSlugs(initial);
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
    selectedSlugsRef.current = selectedSlugs;
  }, [qualifies, selectedSlugs]);

  useEffect(() => {
    return () => {
      if (pageState === 'ready' && !continuedRef.current) {
        trackApplyFunnel(2, 'results_dropoff', {
          qualifies: qualifiesRef.current,
          selected_program_slugs: selectedSlugsRef.current,
        });
      }
    };
  }, [pageState]);

  const handleContinue = () => {
    if (selectedSlugs.length === 0) {
      trackApplyFunnel(2, 'program_continue_blocked');
      return;
    }
    continuedRef.current = true;
    trackApplyFunnel(2, 'program_selected', {
      program_slugs: selectedSlugs,
      qualifies,
    });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(APPLY_PROGRAM_RANKED_KEY, JSON.stringify(selectedSlugs));
      sessionStorage.setItem(APPLY_PROGRAM_SLUG_KEY, selectedSlugs[0]);
    }
    window.location.href = '/apply/create-account';
  };

  const programsOrdered = useMemo(() => {
    const base =
      qualifies === true
        ? [...PROGRAMS]
        : [...PROGRAMS].sort((a, b) => {
            const dig = 'digital-literacy-empowerment-class';
            if (a.slug === dig) return -1;
            if (b.slug === dig) return 1;
            return 0;
          });
    // Priority: explicit ?program= first, then quiz recs (deduped). Mirrors
    // selection precedence so the card user clicked from is ranked first.
    const explicitSlug = programParam && getProgramBySlug(programParam) ? programParam : null;
    const priority: string[] = [];
    if (explicitSlug) priority.push(explicitSlug);
    for (const s of quizRecommendedSlugs) {
      if (!priority.includes(s)) priority.push(s);
    }
    if (priority.length === 0) return base;
    return [...base].sort((a, b) => {
      const ai = priority.indexOf(a.slug);
      const bi = priority.indexOf(b.slug);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return 0;
    });
  }, [qualifies, quizRecommendedSlugs, programParam]);

  const rankLabel = (slug: string) => {
    const i = selectedSlugs.indexOf(slug);
    if (i < 0) return null;
    return ['1st choice', '2nd choice', '3rd choice'][i] ?? `${i + 1}`;
  };

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
        <p className="apply-progress-label">Step 2 of 3 — choose your program(s)</p>
      </div>

      <div className="apply-step-content">
        <p className="apply-step-back-nav">
          <Link href="/apply">← Back to step 1 — eligibility</Link>
        </p>
        <p className="apply-step-kicker">About 2 minutes • still no account required</p>
        <div className="apply-transition-card" role="note" aria-label="What happens after program selection">
          <strong>Before you continue:</strong>
          <span>
            {' '}
            Pick up to <strong>three</strong> programs in order of preference (1st = what you want most). You can change your mind later with a counselor.
            If you used the <Link href="/find-your-path">pathfinder quiz</Link>, we may have pre-filled your top matches.
          </span>
        </div>
        {qualifies ? (
          <>
            <div className={`funding-banner funding-banner-qualify`} style={{ marginBottom: '1.5rem' }}>
              <p>
                <strong>Looks like a strong funding fit.</strong> Rank the programs you want most, then create your account so a counselor can confirm next steps within 1–2 business days.
              </p>
            </div>
            <div className="apply-undecided-reassurance" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', background: 'var(--surface-container)', borderRadius: '8px', border: '1px solid var(--outline-variant)' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--color-on-surface-variant)' }}>
                <strong style={{ color: 'var(--color-on-surface)' }}>Not sure which program?</strong> That is normal. Pick the one that feels closest to your goals — a counselor will help confirm the fit when we follow up. You are not locked in.
              </p>
            </div>
            <h2 className="apply-step-title">Which programs interest you most?</h2>
            <p className="apply-results-program-hint">Tap up to three — order is your preference. Your first choice is your primary starting point.</p>
          </>
        ) : (
          <>
            <div className="apply-results-anyway" style={{ marginBottom: '1rem', padding: '1rem 1.25rem', background: 'var(--surface-container)', borderRadius: '8px' }}>
              <p style={{ margin: 0 }}>
                <strong>Your answers don&rsquo;t match our standard funding profile right now.</strong> That is not a final decision. We still review every application,
                suggest realistic next steps, and often start people with foundational options while we sort out timing and support.
              </p>
            </div>
            <section className="apply-foundational-support" aria-labelledby="apply-foundational-heading">
              <h2 id="apply-foundational-heading" className="apply-foundational-support__title">
                Start with support
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
            <h2 className="apply-step-title">Which programs should we start with?</h2>
            <p className="apply-results-program-hint">Select up to three in order. Your first choice is your starting point — not a final commitment.</p>
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
          {programsOrdered.map((p: Program) => {
            const rank = rankLabel(p.slug);
            const selected = rank !== null;
            return (
              <div
                key={p.slug}
                className="apply-results-program-card"
                onClick={() => setSelectedSlugs((prev) => toggleSlug(prev, p.slug, 3))}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedSlugs((prev) => toggleSlug(prev, p.slug, 3));
                  }
                }}
                aria-pressed={selected}
                style={{
                  padding: '1.25rem',
                  border: selected ? '2px solid var(--color-accent)' : '1px solid var(--outline-variant)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  background: selected ? 'rgba(74, 155, 79, 0.08)' : 'var(--color-white)',
                  position: 'relative',
                }}
              >
                {quizRecommendedSlugs.includes(p.slug) && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      left: '0.5rem',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--color-on-primary)',
                      background: 'var(--color-primary)',
                      padding: '0.2rem 0.45rem',
                      borderRadius: 4,
                    }}
                  >
                    From career quiz
                  </span>
                )}
                {rank && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--color-accent)',
                    }}
                  >
                    {rank}
                  </span>
                )}
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
                <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                  <div>⏱ {p.duration}</div>
                  <div style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{p.salary}</div>
                </div>
              </div>
            );
          })}
        </div>

        {selectedSlugs.length === 0 && (
          <p className="apply-continue-hint" role="alert">
            Select at least one program to continue. Tap again to remove; you can rank up to three.
          </p>
        )}

        <button type="button" className="btn btn-primary" disabled={selectedSlugs.length === 0} onClick={handleContinue}>
          Continue to step 3 — create your account →
        </button>
      </div>
    </div>
  );
}
