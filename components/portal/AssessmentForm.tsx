'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PROGRAM_TITLES } from '@/lib/content/programs';
import { ASSESSMENT_QUESTIONS, scoreAssessment, type QuestionChoice } from '@/lib/assessment/answer-key';

const ASSESSMENT_REDIRECT_KEY = 'assessment_intended_destination';

const TOTAL_STEPS = 8;

/** Step 1: About You. Steps 2–8: question ranges (inclusive). */
const STEP_CONFIG = [
  { id: 1, title: 'About You', questionRange: null as [number, number] | null },
  { id: 2, title: 'Basic Skills', questionRange: [1, 5] as [number, number] },
  { id: 3, title: 'Technical Aptitude', questionRange: [6, 10] as [number, number] },
  { id: 4, title: 'Problem Solving', questionRange: [11, 15] as [number, number] },
  { id: 5, title: 'Communication', questionRange: [16, 20] as [number, number] },
  { id: 6, title: 'Learning Style', questionRange: [21, 25] as [number, number] },
  { id: 7, title: 'Career Goals', questionRange: [26, 30] as [number, number] },
  { id: 8, title: 'Final Questions', questionRange: [31, 35] as [number, number] },
];

type AssessmentFormProps = {
  defaultFirstName: string;
  defaultLastName: string;
  defaultPhone: string;
  defaultRedirectTo?: string;
};

export default function AssessmentForm({ defaultFirstName, defaultLastName, defaultPhone, defaultRedirectTo }: AssessmentFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState<{ message: string; pct: number } | null>(null);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [phone, setPhone] = useState(defaultPhone);
  const [programInterest, setProgramInterest] = useState('');
  const [answers, setAnswers] = useState<Record<number, QuestionChoice>>({});

  const config = STEP_CONFIG[currentStep - 1];
  const questionsInStep = config?.questionRange
    ? ASSESSMENT_QUESTIONS.filter((q) => q.id >= config.questionRange![0] && q.id <= config.questionRange![1])
    : [];
  const answeredInStep = questionsInStep.filter((q) => answers[q.id] != null).length;
  const stepComplete = config?.questionRange
    ? answeredInStep === questionsInStep.length
    : !!(firstName.trim() && lastName.trim() && phone.trim() && programInterest);

  const setAnswer = (qId: number, choice: QuestionChoice) => {
    setAnswers((prev) => ({ ...prev, [qId]: choice }));
  };

  const validateStep1 = (): string | null => {
    if (!firstName.trim()) return 'First name is required.';
    if (!lastName.trim()) return 'Last name is required.';
    if (!phone.trim()) return 'Phone number is required.';
    if (!programInterest) return 'Please select a program of interest.';
    return null;
  };

  const handleNext = () => {
    setError('');
    setDirection('next');

    if (currentStep === 1) {
      const err = validateStep1();
      if (err) {
        setError(err);
        return;
      }
    } else if (!stepComplete) {
      setError(`Please answer all questions in this section before continuing.`);
      return;
    }

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setError('');
    setDirection('prev');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const err = validateStep1();
    if (err) {
      setError(err);
      return;
    }

    const totalQuestions = ASSESSMENT_QUESTIONS.length;
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < totalQuestions) {
      setError(`Please answer all ${totalQuestions} questions. You have answered ${answeredCount}.`);
      return;
    }

    setLoading(true);
    try {
      const { raw, pct } = scoreAssessment(answers);
      const answersForDb = Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v]));

      const res = await fetch('/api/member/assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          programInterest,
          answers: answersForDb,
          rawScore: raw,
          scorePct: pct,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Submission failed. Please try again.');
        setLoading(false);
        return;
      }

      const message =
        pct >= 75
          ? "You're ready to start training! Your counselor will be in touch."
          : pct >= 50
            ? 'Great job! Your counselor may suggest some foundational resources alongside your training.'
            : 'Thanks for completing the assessment. We recommend starting with our Digital Literacy Empowerment Class to set you up for success.';

      setOutcome({ message, pct });
      setStep('confirm');

      const intended =
        (typeof window !== 'undefined' ? sessionStorage.getItem(ASSESSMENT_REDIRECT_KEY) : null) || defaultRedirectTo || null;
      if (typeof window !== 'undefined') sessionStorage.removeItem(ASSESSMENT_REDIRECT_KEY);

      setTimeout(() => {
        if (intended && intended.startsWith('/') && !intended.startsWith('//')) {
          router.push(intended);
        } else {
          router.push('/dashboard');
        }
      }, 3000);
    } catch {
      setError('Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'confirm' && outcome) {
    return (
      <div
        className="assessment-confirm"
        style={{
          textAlign: 'center',
          padding: '3rem 2rem',
          background: 'var(--color-light)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Assessment complete</h2>
        <p
          style={{
            fontSize: '1.1rem',
            marginBottom: '1.5rem',
            maxWidth: '480px',
            margin: '0 auto 1.5rem',
          }}
        >
          {outcome.message}
        </p>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)' }}>Redirecting you shortly...</p>
      </div>
    );
  }

  return (
    <div className={`assessment-wizard quiz-flow ${direction === 'prev' ? 'quiz-slide-prev' : 'quiz-slide-next'}`}>
      {/* Progress indicator */}
      <div className="quiz-progress-bar assessment-wizard-progress">
        <div
          className="quiz-progress-fill"
          style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
        />
        <p className="quiz-progress-label">
          Step {currentStep} of {TOTAL_STEPS}
        </p>
        <div className="assessment-wizard-steps" aria-hidden>
          {STEP_CONFIG.map((s) => (
            <span
              key={s.id}
              className={`assessment-wizard-dot ${s.id <= currentStep ? 'active' : ''} ${s.id === currentStep ? 'current' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="quiz-step-content assessment-wizard-content">
        {currentStep > 1 && (
          <button type="button" className="quiz-back-link" onClick={handleBack}>
            ← Back
          </button>
        )}

        {currentStep === 1 ? (
          <section className="assessment-section">
            <h2 className="quiz-question" style={{ marginBottom: '1.25rem' }}>
              About You
            </h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="firstName">First Name *</label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last Name *</label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                />
              </div>
              <div className="form-group">
                <label htmlFor="programInterest">Program of Interest *</label>
                <select
                  id="programInterest"
                  value={programInterest}
                  onChange={(e) => setProgramInterest(e.target.value)}
                  required
                >
                  <option value="">Select a program</option>
                  {PROGRAM_TITLES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        ) : (
          <section className="assessment-section">
            <h2 className="quiz-question" style={{ marginBottom: '0.5rem' }}>
              {config?.title}
            </h2>
            <p style={{ marginBottom: '1.5rem', color: 'var(--color-gray-600)', fontSize: '0.9rem' }}>
              Questions {config?.questionRange?.[0]}–{config?.questionRange?.[1]} of {ASSESSMENT_QUESTIONS.length}
            </p>
            <div className="assessment-questions-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {questionsInStep.map((q) => (
                <fieldset
                  key={q.id}
                  className="assessment-question"
                  style={{ border: 'none', padding: 0, margin: 0 }}
                >
                  <legend style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                    Q{q.id}. {q.question}
                  </legend>
                  <div className="quiz-answers" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {q.choices.map((c) => (
                      <label
                        key={c.value}
                        className={`quiz-answer-card ${answers[q.id] === c.value ? 'selected' : ''}`}
                        style={{ cursor: 'pointer' }}
                      >
                        <input
                          type="radio"
                          name={`q${q.id}`}
                          value={c.value}
                          checked={answers[q.id] === c.value}
                          onChange={() => setAnswer(q.id, c.value)}
                        />
                        <span className="radio-dot" />
                        <span>
                          {c.value}) {c.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>
        )}

        {currentStep === TOTAL_STEPS && stepComplete && (
          <div
            className="assessment-wizard-summary"
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: 'var(--color-light)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-gray-200)',
              fontSize: '0.9rem',
            }}
          >
            <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Review</p>
            <p style={{ margin: 0, color: 'var(--color-gray-600)' }}>
              {firstName} {lastName} • {programInterest} • All 35 questions answered
            </p>
          </div>
        )}

        {error && (
          <p className="form-error" role="alert" style={{ marginTop: '1rem' }}>
            {error}
          </p>
        )}

        <div className="assessment-wizard-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {currentStep < TOTAL_STEPS ? (
            <button type="button" className="btn btn-primary" onClick={handleNext}>
              Next →
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading || !stepComplete}
            >
              {loading ? 'Submitting...' : 'Submit Assessment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
