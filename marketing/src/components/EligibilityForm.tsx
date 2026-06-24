import { useState } from 'react';

/**
 * Interactive eligibility check — a real React island (hydrated via client:visible).
 * Mirrors the live /apply eligibility questions. Truth-locked: copy + criteria
 * match the real funnel; this spike resolves client-side (no backend POST wired).
 */

type Answers = { employment: boolean | null; income: boolean | null; auth: boolean | null };

const QUESTIONS: { key: keyof Answers; label: string }[] = [
  { key: 'employment', label: 'Are you currently unemployed, working part-time when you want full-time work, or in a job that pays below what your skills should command (underemployed)?' },
  { key: 'income', label: "Is your household's total annual income below $60,000 before taxes?" },
  { key: 'auth', label: 'Are you authorized to work in the United States?' },
];

export default function EligibilityForm() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ employment: null, income: null, auth: null });
  const [contact, setContact] = useState({ name: '', email: '' });
  const [submitted, setSubmitted] = useState(false);

  const total = QUESTIONS.length;
  const answeredCount = Object.values(answers).filter((v) => v !== null).length;
  const pct = submitted ? 100 : Math.round((answeredCount / (total + 1)) * 100);
  const likelyEligible = answers.employment === true && answers.auth === true; // income broadens funding, never disqualifies outreach

  function answer(key: keyof Answers, val: boolean) {
    setAnswers((a) => ({ ...a, [key]: val }));
    setStep((s) => Math.min(s + 1, total));
  }

  if (submitted) {
    return (
      <div className="elig-card">
        <div className="elig-done">
          <span className="elig-done__ic">✓</span>
          <h3>Thanks, {contact.name.split(' ')[0] || 'there'} — your check is in.</h3>
          <p>
            {likelyEligible
              ? 'Based on your answers you look like a strong fit. '
              : 'Eligibility depends on a few factors, so an advisor will confirm your options. '}
            A real team reviews every application and follows up in 1 to 2 business days.
          </p>
          <div className="elig-actions">
            <a className="btn btn--primary" href="/programs">Browse programs</a>
            <a className="btn btn--ghost" href="/find-your-path">Find your path</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="elig-card">
      <div className="elig-head">
        <div>
          <span className="elig-kicker">Quick eligibility check</span>
          <h3>Answer 3 questions to get started</h3>
        </div>
        <span className="elig-progress">{pct}%</span>
      </div>
      <div className="elig-bar"><i style={{ width: `${pct}%` }} /></div>

      {QUESTIONS.map((q, i) => (
        <fieldset className="elig-q" data-active={i === step} key={q.key} disabled={i > step}>
          <legend>{q.label}</legend>
          <div className="elig-opts">
            {(['Yes', 'No'] as const).map((opt) => {
              const val = opt === 'Yes';
              const active = answers[q.key] === val;
              return (
                <button
                  type="button"
                  key={opt}
                  className={`elig-opt${active ? ' is-on' : ''}`}
                  aria-pressed={active}
                  onClick={() => answer(q.key, val)}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {step >= total && (
        <form
          className="elig-contact"
          onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
        >
          <h4>How can we reach you?</h4>
          <div className="elig-fields">
            <label>
              <span>Full name</span>
              <input required value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} placeholder="Your name" />
            </label>
            <label>
              <span>Email</span>
              <input required type="email" value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} placeholder="you@email.com" />
            </label>
          </div>
          <button className="btn btn--primary" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
            Submit eligibility check →
          </button>
          <p className="elig-fine">No cost for qualifying members · about 5 minutes · reviewed by a real team.</p>
        </form>
      )}
    </div>
  );
}
