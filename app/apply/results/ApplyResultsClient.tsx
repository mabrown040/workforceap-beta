'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import LocalizedLink from '@/components/LocalizedLink';
import { PROGRAMS, getProgramBySlug, type Program } from '@/lib/content/programs';
import { APPLY_STORAGE_KEY } from '../ApplyEligibilityClient';
import {
  APPLY_PROGRAM_SLUG_KEY,
  APPLY_PROGRAM_RANKED_KEY,
  APPLY_FLOW_DRAFT_KEY,
  type ApplyFlowDraftV1,
} from '@/lib/apply/applyProgramStorage';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ProgramIcon } from '@/components/ProgramIcon';
import { useTranslations } from 'next-intl';
import { trackApplyFunnel } from '@/lib/analytics/events';

const FYP_RESULTS_KEY = 'find_your_path_results';
const APPLY_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Mirrors ApplyEligibilityClient's readDraft() — just the presence/freshness check. */
function hasSavedApplyDraft(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(APPLY_FLOW_DRAFT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as ApplyFlowDraftV1;
    if (parsed?.version !== 1) return false;
    if (typeof parsed.updatedAt === 'string') {
      const updated = Date.parse(parsed.updatedAt);
      if (Number.isFinite(updated) && Date.now() - updated > APPLY_DRAFT_TTL_MS) return false;
    }
    return true;
  } catch {
    return false;
  }
}

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
  const t = useTranslations('apply');
  const searchParams = useSearchParams();
  const programParam = searchParams?.get('program');
  const [pageState, setPageState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
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
      // sessionStorage is per-tab; the localStorage mirror covers "finish
      // later" resumes in a new tab.
      const stored =
        sessionStorage.getItem(APPLY_STORAGE_KEY) ?? localStorage.getItem(APPLY_STORAGE_KEY);
      if (!stored) {
        trackApplyFunnel(2, 'results_missing_prereq');
        setHasSavedDraft(hasSavedApplyDraft());
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
      setHasSavedDraft(hasSavedApplyDraft());
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

  const [shareCopied, setShareCopied] = useState(false);
  const handleShareLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('program', selectedSlugs.join(','));
    navigator.clipboard.writeText(url.toString()).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

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
    const base = [...PROGRAMS];
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
  }, [quizRecommendedSlugs, programParam]);

  const rankLabel = (slug: string) => {
    const i = selectedSlugs.indexOf(slug);
    if (i < 0) return null;
    const labels = [t('resultsRankFirst'), t('resultsRankSecond'), t('resultsRankThird')];
    return labels[i] ?? `${i + 1}`;
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
          <p className="apply-progress-label">{t('resultsProgressLabel')}</p>
        </div>
        <div className="apply-step-content apply-missing-session">
          {hasSavedDraft ? (
            <>
              <h2 className="apply-step-title">{t('resultsMissingResumeTitle')}</h2>
              <p className="apply-step-desc">
                {t('resultsMissingResumeDesc')}
              </p>
              <p style={{ marginBottom: '1.25rem' }}>
                <LocalizedLink href="/apply" className="btn btn-primary">
                  {t('resultsMissingResumeCta')}
                </LocalizedLink>
              </p>
            </>
          ) : (
            <>
              <h2 className="apply-step-title">{t('resultsMissingTitle')}</h2>
              <p className="apply-step-desc">
                {t('resultsMissingDesc')}
              </p>
              <p style={{ marginBottom: '1.25rem' }}>
                <LocalizedLink href="/apply" className="btn btn-primary">
                  {t('resultsMissingCta')}
                </LocalizedLink>
              </p>
              <p className="apply-step-desc" style={{ fontSize: '0.9rem' }}>
                {t('resultsMissingFootnote')} <LocalizedLink href="/apply">/apply</LocalizedLink> {t('resultsMissingFootnoteSuffix')}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="apply-flow">
      <div className="apply-progress-bar">
        <div className="apply-progress-fill" style={{ width: '66%' }} />
        <p className="apply-progress-label">{t('resultsProgressLabel')}</p>
      </div>

      <div className="apply-step-content">
        <p className="apply-step-back-nav">
          <LocalizedLink href="/apply">{t('resultsBackStep1')}</LocalizedLink>
        </p>
        <p className="apply-step-kicker">{t('resultsKicker')}</p>
        <details className="apply-transition-details">
          <summary className="apply-transition-details__summary">{t('resultsTransitionSummary')}</summary>
          <div className="apply-transition-details__body">
            <div className="apply-transition-card" role="note" aria-label={t('resultsTransitionAria')}>
              <strong>{t('resultsBeforeStrong')}</strong>
              <span>
                {' '}
                {t('resultsBeforePick')}{' '}
                <LocalizedLink href="/find-your-path">{t('resultsPathfinderQuizLink')}</LocalizedLink>
                {t('resultsBeforeSuffix')}
              </span>
            </div>
          </div>
        </details>
        <div className="apply-results-preface">
        {qualifies ? (
          <>
            <div className={`funding-banner funding-banner-qualify`} style={{ marginBottom: '1.5rem' }}>
              <p>
                <strong>{t('resultsFundingFitStrong')}</strong> {t('resultsFundingFitRest')}
              </p>
            </div>
            <div className="apply-undecided-reassurance" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', background: 'var(--surface-container)', borderRadius: '8px', border: '1px solid var(--outline-variant)' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--color-on-surface-variant)' }}>
                <strong style={{ color: 'var(--color-on-surface)' }}>{t('resultsUndecidedLead')}</strong> {t('resultsUndecidedBody')}
              </p>
            </div>
            <h2 className="apply-step-title">{t('resultsTitleQualifies')}</h2>
            <p className="apply-results-program-hint">{t('resultsHintQualifies')}</p>
          </>
        ) : (
          <>
            <div className="apply-results-anyway" style={{ marginBottom: '1rem', padding: '1rem 1.25rem', background: 'var(--surface-container)', borderRadius: '8px' }}>
              <p style={{ margin: 0 }}>
                <strong>{t('resultsMismatchStrong')}</strong> {t('resultsMismatchRest')}
              </p>
            </div>
            <section className="apply-foundational-support" aria-labelledby="apply-foundational-heading">
              <h2 id="apply-foundational-heading" className="apply-foundational-support__title">
                {t('resultsFoundationalTitle')}
              </h2>
              <ul className="apply-foundational-support__list">
                <li>
                  <strong>{t('resultsFoundationalLi1Strong')}</strong> {t('resultsFoundationalLi1Rest')}{' '}
                  <LocalizedLink href="/find-your-path">{t('resultsTwoMinutePathfinder')}</LocalizedLink> {t('resultsFoundationalLi1Suffix')}
                </li>
                <li>
                  <strong>{t('resultsFoundationalLi2Strong')}</strong> <LocalizedLink href="/contact">{t('resultsFoundationalLi2Mid')}</LocalizedLink> {t('resultsFoundationalLi2Suffix')}{' '}
                  <a href="tel:+15127771808">(512) 777-1808</a>.
                </li>
              </ul>
            </section>
            <h2 className="apply-step-title">{t('resultsTitleNonQual')}</h2>
            <p className="apply-results-program-hint">{t('resultsHintNonQual')}</p>
          </>
        )}
        </div>

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
                    {t('resultsFromQuizBadge')}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">schedule</span>
                    {p.duration}
                  </div>
                  <div style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{p.salary}</div>
                </div>
              </div>
            );
          })}
        </div>

        {selectedSlugs.length === 0 && (
          <p className="apply-continue-hint" role="alert">
            {t('resultsSelectProgramError')}
          </p>
        )}

        <button type="button" className="btn btn-primary" disabled={selectedSlugs.length === 0} onClick={handleContinue}>
          {t('resultsContinueAccount')}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          style={{ marginTop: '0.75rem' }}
          onClick={handleShareLink}
          disabled={selectedSlugs.length === 0}
        >
          {shareCopied ? t('shareLinkCopied') : t('shareLink')}
        </button>
      </div>
    </div>
  );
}
