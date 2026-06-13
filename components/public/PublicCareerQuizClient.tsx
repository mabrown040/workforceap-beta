'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getProgramBySlug } from '@/lib/content/programs';
import { safeParseResponseJson } from '@/lib/http/safeFetchJson';
import { QUIZ_QUESTIONS, SCALE_LABELS, areasToTypeSlug } from '@/lib/career/careerQuizRules';

const ACCENT = '#8c0f37';

type ScoreResponse = {
  careers: { code: string; title: string; fit?: string }[];
  careersTotal: number;
  riasec: { area?: string; title?: string; score?: number }[];
  programSlugs: string[];
};

export default function PublicCareerQuizClient({ friendType }: { friendType?: string | null }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>(Array(QUIZ_QUESTIONS.length).fill(null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [shared, setShared] = useState(false);

  async function submit(finalAnswers: (string | null)[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/public/career-quiz/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers.join('') }),
      });
      const parsed = await safeParseResponseJson<ScoreResponse | { error: string }>(res);
      if (!res.ok || !parsed.ok || !parsed.data || 'error' in parsed.data) {
        const msg = parsed.data && 'error' in parsed.data ? parsed.data.error : 'Something went wrong.';
        setError(msg);
      } else {
        setScore(parsed.data);
      }
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }

  function answer(value: number) {
    const next = [...answers];
    next[step] = String(value);
    setAnswers(next);
    if (step + 1 < QUIZ_QUESTIONS.length) {
      setStep(step + 1);
    } else {
      submit(next);
    }
  }

  function restart() {
    setAnswers(Array(QUIZ_QUESTIONS.length).fill(null));
    setStep(0);
    setScore(null);
    setError(null);
  }

  // ── Results ──────────────────────────────────────────────────────────────
  if (score) {
    const topAreas = [...(score.riasec ?? [])]
      .filter((r) => typeof r.score === 'number')
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 2)
      .map((r) => r.title || r.area)
      .filter((a): a is string => Boolean(a));

    const typeSlug = areasToTypeSlug(topAreas);
    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/career-quiz${typeSlug ? `?type=${typeSlug}` : ''}`
        : '';
    const shareText = topAreas.length
      ? `My career type is ${topAreas.join(' & ')} — what's yours? Free 60-second quiz:`
      : 'I just found careers that fit me — free 60-second quiz:';

    async function shareResult() {
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title: 'WorkforceAP Career Quiz', text: shareText, url: shareUrl });
          return;
        } catch {
          /* user cancelled or unsupported — fall through to copy */
        }
      }
      try {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        /* clipboard blocked — nothing more we can do */
      }
    }

    return (
      <div>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Your career snapshot</h1>
        {topAreas.length > 0 && (
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
            You lean <strong>{topAreas.join(' & ')}</strong>. Here’s where that points.
          </p>
        )}

        <div style={{ background: ACCENT, color: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem' }}>Want your full results + a free plan?</p>
          <p style={{ margin: '0.35rem 0 0.9rem', fontSize: '0.9rem', opacity: 0.92 }}>
            Create a free account to save this, take the full assessment, and get matched to no-cost training.
          </p>
          <Link
            href="/apply"
            style={{ display: 'inline-block', background: '#fff', color: ACCENT, fontWeight: 700, padding: '0.6rem 1.1rem', borderRadius: 8, textDecoration: 'none' }}
          >
            Get matched — it’s free
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={shareResult}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>ios_share</span>
            {shared ? 'Link copied!' : 'Share my result'}
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
            Challenge a friend to find their type.
          </span>
        </div>

        {score.careers.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', marginBottom: '0.6rem' }}>
              Careers that fit ({score.careers.length}{score.careersTotal > score.careers.length ? ` of ${score.careersTotal}` : ''})
            </h2>
            <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', listStyle: 'none', padding: 0, margin: 0 }}>
              {score.careers.map((c) => (
                <li key={c.code} style={{ border: '1px solid var(--color-outline)', borderRadius: 999, padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
                  {c.title}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.6rem' }}>Matching WorkforceAP programs</h2>
          {score.programSlugs.length === 0 ? (
            <p style={{ color: 'var(--color-on-surface-variant)' }}>
              No direct program match yet —{' '}
              <Link href="/programs" style={{ fontWeight: 600, color: ACCENT }}>browse all programs</Link>.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
              {score.programSlugs.map((slug) => {
                const p = getProgramBySlug(slug);
                if (!p) return null;
                return (
                  <li key={slug} style={{ border: '1px solid var(--color-outline)', borderRadius: 10, padding: '0.75rem 1rem' }}>
                    <Link href={`/programs/${slug}`} style={{ fontWeight: 600, color: ACCENT }}>
                      {p.title ?? slug}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <button type="button" onClick={restart} className="btn" style={{ fontSize: '0.85rem' }}>
          Retake quiz
        </button>
        <p style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
          Want the deep version?{' '}
          <Link href="/interest-profiler" style={{ fontWeight: 600, color: ACCENT }}>
            Take the full 30-question Interest Profiler
          </Link>.
        </p>
      </div>
    );
  }

  // ── Quiz ─────────────────────────────────────────────────────────────────
  const q = QUIZ_QUESTIONS[step];
  const progress = Math.round((step / QUIZ_QUESTIONS.length) * 100);

  return (
    <div>
      {friendType && step === 0 && (
        <div className="portal-card portal-card--flat" style={{ padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
          A friend’s career type is <strong>{friendType}</strong>. Find yours below 👇
        </div>
      )}
      <h1 style={{ fontSize: '1.6rem', marginBottom: '0.35rem' }}>Quick career quiz</h1>
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem' }}>
        6 quick questions. No account needed.
      </p>

      <div style={{ height: 6, background: 'var(--color-outline)', borderRadius: 999, marginBottom: '1.5rem' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: ACCENT, borderRadius: 999, transition: 'width 0.2s' }} />
      </div>

      {error && (
        <p role="alert" style={{ color: ACCENT, marginBottom: '1rem' }}>
          {error}{' '}
          <button type="button" onClick={() => submit(answers)} style={{ textDecoration: 'underline', background: 'none', border: 0, color: ACCENT, cursor: 'pointer' }}>
            Retry
          </button>
        </p>
      )}

      <p style={{ fontSize: '0.8rem', fontWeight: 700, color: ACCENT, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
        Question {step + 1} of {QUIZ_QUESTIONS.length}
      </p>
      <p style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.25rem', lineHeight: 1.45 }}>
        How much would you enjoy this? <br />“{q.prompt}”
      </p>

      <div style={{ display: 'grid', gap: '0.5rem' }} aria-busy={loading}>
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            disabled={loading}
            onClick={() => answer(v)}
            className="btn"
            style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.7rem 1rem', opacity: loading ? 0.6 : 1 }}
          >
            {SCALE_LABELS[v]}
          </button>
        ))}
      </div>

      {loading && (
        <p style={{ marginTop: '1rem', color: 'var(--color-on-surface-variant)' }}>Scoring your answers…</p>
      )}
    </div>
  );
}
