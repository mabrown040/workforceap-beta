import { useState } from 'react';

/**
 * Public "Quick career quiz" — Astro React island, depth-styled.
 *
 * TRUTH-LOCKED port of the live Next funnel (/career-quiz):
 *   - questions, ids, and order come VERBATIM from lib/career/careerQuizRules.ts
 *     (QUIZ_QUESTIONS) — one activity per O*NET RIASEC interest area, 6 total.
 *   - the 1–5 enjoyment scale + labels are verbatim (SCALE_LABELS).
 *   - the question framing ("How much would you enjoy this?") and the page copy
 *     ("Quick career quiz" / "6 quick questions. No account needed.") match the
 *     live PublicCareerQuizClient.
 *   - the type-slug encoding for the /apply hand-off mirrors areasToTypeSlug +
 *     buildCareerPlanApplyHref (source=career_quiz&type=<slug>).
 *
 * Scoring note: the live app POSTs to /api/public/career-quiz/score, which expands
 * the 6 ratings into O*NET's 30-item vector and calls the O*NET API for specific
 * career titles. That backend is not available from this static marketing site, so
 * this island derives the user's interest *type* directly from the answers — which
 * is exact, because each question maps 1:1 to one RIASEC area (highest-rated areas
 * = the user's type, same areas the server reports). It does NOT invent specific
 * career titles (no fabrication); it points to /programs and /apply, where a real
 * advisor confirms fit.
 */

type RiasecArea =
  | 'Realistic'
  | 'Investigative'
  | 'Artistic'
  | 'Social'
  | 'Enterprising'
  | 'Conventional';

const RIASEC_AREAS: RiasecArea[] = [
  'Realistic',
  'Investigative',
  'Artistic',
  'Social',
  'Enterprising',
  'Conventional',
];

type QuizQuestion = { id: RiasecArea; prompt: string };

// VERBATIM from lib/career/careerQuizRules.ts → QUIZ_QUESTIONS
const QUIZ_QUESTIONS: QuizQuestion[] = [
  { id: 'Realistic', prompt: 'Build, fix, or work hands-on with tools, machines, or the outdoors.' },
  { id: 'Investigative', prompt: 'Dig into problems — research, analyze, and figure out how things work.' },
  { id: 'Artistic', prompt: 'Create, design, or express ideas in original ways.' },
  { id: 'Social', prompt: 'Help, teach, coach, or support other people.' },
  { id: 'Enterprising', prompt: 'Lead, persuade, sell, or start something of your own.' },
  { id: 'Conventional', prompt: 'Organize information, follow clear systems, and keep things accurate.' },
];

// VERBATIM from lib/career/careerQuizRules.ts → SCALE_LABELS (index 0 unused)
const SCALE_LABELS = ['', 'Dislike', 'Slightly dislike', 'Neutral', 'Like', 'Love it'] as const;

// Plain-language descriptions of each interest area (factual O*NET RIASEC framing,
// not fabricated career titles).
const AREA_BLURB: Record<RiasecArea, string> = {
  Realistic: 'You like hands-on, practical work — building, fixing, and working with tools, machines, or the outdoors.',
  Investigative: 'You like to research, analyze, and figure out how things work.',
  Artistic: 'You like to create, design, and express ideas in original ways.',
  Social: 'You like to help, teach, coach, and support other people.',
  Enterprising: 'You like to lead, persuade, sell, or start something of your own.',
  Conventional: 'You like to organize information, follow clear systems, and keep things accurate.',
};

// Mirrors areasToTypeSlug() — top areas → "investigative-social"
function areasToTypeSlug(areas: string[]): string {
  const valid = RIASEC_AREAS.map((a) => a.toLowerCase());
  return areas
    .map((a) => a.toLowerCase())
    .filter((a) => valid.includes(a))
    .slice(0, 2)
    .join('-');
}

export default function CareerQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(QUIZ_QUESTIONS.length).fill(null),
  );
  const [done, setDone] = useState(false);

  const total = QUIZ_QUESTIONS.length;

  function answer(value: number) {
    const next = [...answers];
    next[step] = value;
    setAnswers(next);
    if (step + 1 < total) {
      setStep(step + 1);
    } else {
      setDone(true);
    }
  }

  function restart() {
    setAnswers(Array(total).fill(null));
    setStep(0);
    setDone(false);
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (done) {
    // Top areas = highest-rated questions (each question is one RIASEC area).
    const ranked = QUIZ_QUESTIONS
      .map((q, i) => ({ area: q.id, score: answers[i] ?? 0 }))
      .sort((a, b) => b.score - a.score);
    const topAreas = ranked.slice(0, 2).map((r) => r.area);
    const typeLabel = topAreas.join(' & ');
    const typeSlug = areasToTypeSlug(topAreas);
    const applyHref = `/apply?source=career_quiz${typeSlug ? `&type=${typeSlug}` : ''}`;

    return (
      <div className="cq-card cq-result" role="region" aria-label="Your career quiz result">
        <span className="cq-kicker">Your career type</span>
        <h3 className="cq-result__type">
          You lean <span className="cq-grad">{topAreas[0]}</span>
          {topAreas[1] ? (
            <>
              {' '}&amp; <span className="cq-grad">{topAreas[1]}</span>
            </>
          ) : null}
        </h3>

        <ul className="cq-areas">
          {topAreas.map((area) => (
            <li className="cq-area" key={area}>
              <span className="cq-area__name">{area}</span>
              <span className="cq-area__blurb">{AREA_BLURB[area as RiasecArea]}</span>
            </li>
          ))}
        </ul>

        <p className="cq-result__lead">
          Careers and WorkforceAP training can be matched to your {typeLabel || 'interest'} type. An
          advisor confirms the best-fit path with you — at no cost to members who qualify through scholarship/grant funded membership.
        </p>

        <div className="cq-actions">
          <a className="btn btn--primary" href={applyHref}>
            Save my free career plan →
          </a>
          <a className="btn btn--ghost" href="/programs">
            Browse programs
          </a>
        </div>

        <button type="button" className="cq-restart" onClick={restart}>
          Retake the quiz
        </button>

        <p className="cq-fine">
          6 questions · no account needed · 501(c)(3) nonprofit · reviewed by a real team.
        </p>
      </div>
    );
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────
  const q = QUIZ_QUESTIONS[step];
  // Reflect the current question (1-based) so the bar shows movement on Q1
  // instead of reading 0% / broken.
  const progress = Math.round(((step + 1) / total) * 100);

  return (
    <div className="cq-card">
      <div className="cq-head">
        <div>
          <span className="cq-kicker">Quick career quiz</span>
          <h3>6 quick questions. No account needed.</h3>
        </div>
        <span className="cq-progress" aria-hidden="true">{progress}%</span>
      </div>

      <div className="cq-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Quiz progress">
        <i style={{ width: `${progress}%` }} />
      </div>

      <p className="cq-count">
        Question {step + 1} of {total}
      </p>

      <fieldset className="cq-q">
        <legend>
          How much would you enjoy this?
          <span className="cq-prompt">&ldquo;{q.prompt}&rdquo;</span>
        </legend>
        <div className="cq-opts">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              type="button"
              className="cq-opt"
              aria-label={`${SCALE_LABELS[v]} — for: ${q.prompt}`}
              onClick={() => answer(v)}
            >
              {SCALE_LABELS[v]}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
