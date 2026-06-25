import { useCallback, useEffect, useState } from 'react';

/**
 * O*NET Interest Profiler (Mini-IP, 30 questions) — Astro React island.
 *
 * TRUTH-LOCK: The 30 questions and all scoring are O*NET Interest Profiler™
 * content from the U.S. Department of Labor, fetched LIVE from the same Next
 * API routes that power /interest-profiler:
 *   - GET  /api/public/interest-profiler/questions  → the 30 verbatim activities
 *   - POST /api/public/interest-profiler/score      → RIASEC result, careers,
 *                                                      program slugs (30-char [1-5])
 * The marketing site builds into the Next app's public/m and is served from the
 * same origin, so these relative fetches resolve to the real backend. Nothing
 * here invents questions, results, or careers. Copy is ported verbatim from
 * components/public/PublicInterestProfilerClient.tsx.
 */

type QuestionRow = { id: string; text: string; area?: string };

type ScoreResponse = {
  result: { code: string; title: string; description?: string; score: number }[];
  careers: { code: string; title: string; fit?: string }[];
  careersTotal: number;
  riasec: unknown | null;
  programSlugs: string[];
};

// Program slug → display label fallback (the Next version resolves titles via
// getProgramBySlug; here we render the slug nicely and link to /programs/<slug>).
function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

const LIKERT = [
  { v: 1, label: 'Strongly dislike' },
  { v: 2, label: 'Dislike' },
  { v: 3, label: 'Unsure' },
  { v: 4, label: 'Like' },
  { v: 5, label: 'Strongly like' },
] as const;

export default function InterestProfilerQuiz() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [step, setStep] = useState(0);
  const [digits, setDigits] = useState<number[]>(() => Array(30).fill(3));
  const [submitting, setSubmitting] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [score, setScore] = useState<ScoreResponse | null>(null);

  const handleSubmit = useCallback(async () => {
    const answerString = digits.slice(0, questions.length).join('');
    if (answerString.length !== 30) return;
    setSubmitting(true);
    setScoreError(null);
    try {
      const res = await fetch('/api/public/interest-profiler/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answerString }),
      });
      const data = (await res.json()) as ScoreResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not score answers');
      setScore(data);
    } catch (e) {
      setScoreError(e instanceof Error ? e.message : 'Scoring failed');
    } finally {
      setSubmitting(false);
    }
  }, [digits, questions.length]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/public/interest-profiler/questions');
        const data = (await res.json()) as { questions?: QuestionRow[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Failed to load');
        if (!data.questions?.length) throw new Error('No questions available');
        if (!cancelled) {
          setQuestions(data.questions);
          setDigits((d) => {
            const next = [...d];
            while (next.length < data.questions!.length) next.push(3);
            return next.slice(0, data.questions!.length);
          });
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="ipq-card">
        <p className="ipq-status" role="status">
          Loading Interest Profiler questions…
        </p>
      </div>
    );
  }

  if (!loadError && questions.length > 0 && questions.length !== 30) {
    return (
      <div className="ipq-card">
        <h2 className="ipq-h">O*NET Interest Profiler</h2>
        <p className="ipq-lede">
          The Mini Interest Profiler should load exactly 30 questions; this session received {questions.length}. Please
          refresh the page or try again later.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="ipq-card">
        <h2 className="ipq-h">O*NET Interest Profiler</h2>
        <p className="ipq-err" role="alert">{loadError}</p>
        <p className="ipq-fine" style={{ marginTop: '1rem' }}>
          The Interest Profiler is provided by the U.S. Department of Labor through O*NET Web Services. Your site needs a
          valid <code>ONET_API_KEY</code> to load questions.
        </p>
      </div>
    );
  }

  if (score) {
    const maxRiasec = Math.max(1, ...score.result.map((r) => r.score));
    return (
      <div className="ipq-card">
        <h2 className="ipq-h">Your interest profile</h2>
        <p className="ipq-lede">
          Here are your RIASEC interest scores from the Mini Interest Profiler (30 questions). Want to save them and use
          them to find training programs? Join WorkforceAP — creating an account takes about 2 minutes.
        </p>

        <div className="ipq-cta">
          <a className="btn btn--primary" href="/apply">Join WorkforceAP</a>
          <span className="ipq-cta__alt">
            or <a href="/programs">browse programs</a>
          </span>
        </div>

        <section className="ipq-section">
          <h3 className="ipq-h3">Interest areas</h3>
          <ul className="ipq-bars">
            {score.result.map((r) => (
              <li key={r.code} className="ipq-bar-row">
                <div className="ipq-bar-head">
                  <span className="ipq-bar-name">{r.title}</span>
                  <span className="ipq-bar-score">{r.score}</span>
                </div>
                <div className="ipq-bar-track">
                  <i style={{ width: `${(r.score / maxRiasec) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {score.careers.length > 0 && (
          <section className="ipq-section">
            <h3 className="ipq-h3">
              Sample career matches ({score.careers.length}
              {score.careersTotal > score.careers.length ? ` of ${score.careersTotal}` : ''})
            </h3>
            <p className="ipq-fine ipq-section__note">
              From O*NET — not an employer list. Use them as exploration anchors.
            </p>
            <ul className="ipq-careers">
              {score.careers.slice(0, 12).map((c) => (
                <li key={c.code}>
                  {c.title} <span className="ipq-muted">({c.code})</span>
                  {c.fit ? ` — ${c.fit}` : ''}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="ipq-section">
          <h3 className="ipq-h3">WorkforceAP programs</h3>
          {score.programSlugs.length === 0 ? (
            <p className="ipq-lede">
              No mapped programs yet for these career codes — your counselor can still help you choose a track. Try{' '}
              <a className="ipq-link" href="/find-your-path">Find Your Path</a> for a quick program match.
            </p>
          ) : (
            <ul className="ipq-programs">
              {score.programSlugs.map((slug) => (
                <li key={slug}>
                  <a className="ipq-link" href={`/programs/${slug}`}>{slugToTitle(slug)}</a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="ipq-save">
          <span className="ipq-save__ic" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg></span>
          <div>
            <p className="ipq-save__title">Save your results</p>
            <p className="ipq-save__body">
              Create a free WorkforceAP account to save your profile, compare it against any occupation, and get a
              personalized training plan.
            </p>
          </div>
        </div>

        <p className="ipq-fine">
          O*NET Interest Profiler™ is a trademark of the U.S. Department of Labor. This site uses O*NET Web Services
          under the terms described at{' '}
          <a href="https://services.onetcenter.org/help/license" target="_blank" rel="noopener noreferrer">
            services.onetcenter.org
          </a>
          .
        </p>
      </div>
    );
  }

  const q = questions[step];
  const total = questions.length || 30;
  const progress = total ? ((step + 1) / total) * 100 : 0;

  return (
    <div className="ipq-card">
      <h2 className="ipq-h">O*NET Interest Profiler (Mini)</h2>
      <p className="ipq-lede">
        Rate how much you would enjoy each activity. There are {total} questions; allow about 10 minutes. Your answers
        stay in this browser until you submit.
      </p>

      <div className="ipq-progress" aria-hidden="true">
        <i style={{ width: `${progress}%` }} />
      </div>

      {q && (
        <div className="ipq-q">
          {q.area && <p className="ipq-q__area">{q.area}</p>}
          <p className="ipq-q__text">{q.text}</p>
        </div>
      )}

      <fieldset className="ipq-fieldset">
        <legend className="ipq-legend">How would you feel about this kind of work?</legend>
        <div className="ipq-opts" role="radiogroup" aria-label="How would you feel about this kind of work?">
          {LIKERT.map(({ v, label }) => {
            const selected = digits[step] === v;
            return (
              <label key={v} className={`ipq-opt${selected ? ' is-on' : ''}`}>
                <input
                  type="radio"
                  name={`ip-q-${step}`}
                  checked={selected}
                  onChange={() => {
                    setDigits((prev) => {
                      const next = [...prev];
                      next[step] = v;
                      return next;
                    });
                  }}
                />
                <span className="ipq-opt__num" aria-hidden="true">{v}</span>
                <span className="ipq-opt__label">{label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {scoreError && (
        <p className="ipq-err" role="alert">{scoreError}</p>
      )}

      <div className="ipq-nav">
        <button
          type="button"
          className="btn btn--ghost"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </button>
        {step < total - 1 ? (
          <button type="button" className="btn btn--primary" onClick={() => setStep((s) => s + 1)}>
            Next
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Scoring…' : 'See results'}
          </button>
        )}
        <span className="ipq-count">Question {step + 1} of {total}</span>
      </div>
    </div>
  );
}
