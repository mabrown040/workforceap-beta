'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PROGRAM_TITLES } from '@/lib/content/programs';
import { ASSESSMENT_QUESTIONS, scoreAssessment, type QuestionChoice } from '@/lib/assessment/answer-key';

const ASSESSMENT_REDIRECT_KEY = 'assessment_intended_destination';

type AssessmentFormProps = {
  defaultFirstName: string;
  defaultLastName: string;
  defaultPhone: string;
  defaultRedirectTo?: string;
};

export default function AssessmentForm({ defaultFirstName, defaultLastName, defaultPhone, defaultRedirectTo }: AssessmentFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState<{ message: string; pct: number } | null>(null);

  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [phone, setPhone] = useState(defaultPhone);
  const [programInterest, setProgramInterest] = useState('');
  const [answers, setAnswers] = useState<Record<number, QuestionChoice>>({});

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = ASSESSMENT_QUESTIONS.length;

  const setAnswer = (qId: number, choice: QuestionChoice) => {
    setAnswers((prev) => ({ ...prev, [qId]: choice }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim()) {
      setError('First name is required.');
      return;
    }
    if (!lastName.trim()) {
      setError('Last name is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone number is required.');
      return;
    }
    if (!programInterest) {
      setError('Please select a program of interest.');
      return;
    }

    if (answeredCount < totalQuestions) {
      setError(`Please answer all ${totalQuestions} questions. You have answered ${answeredCount}.`);
      return;
    }

    setLoading(true);
    try {
      const { raw, pct } = scoreAssessment(answers);
      const answersForDb = Object.fromEntries(
        Object.entries(answers).map(([k, v]) => [k, v])
      );

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

      const intended = (typeof window !== 'undefined' ? sessionStorage.getItem(ASSESSMENT_REDIRECT_KEY) : null)
        || defaultRedirectTo
        || null;
      if (typeof window !== 'undefined') sessionStorage.removeItem(ASSESSMENT_REDIRECT_KEY);

      setTimeout(() => {
        if (intended && intended.startsWith('http')) {
          window.location.href = intended;
        } else {
          router.push(intended || '/dashboard');
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
      <div className="assessment-confirm" style={{ textAlign: 'center', padding: '3rem 2rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Assessment complete</h2>
        <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>{outcome.message}</p>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)' }}>Redirecting you shortly...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="assessment-form">
      <section className="assessment-section" style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>About You</h2>
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
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="assessment-section" style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Assessment Questions</h2>
        <p style={{ marginBottom: '1.5rem', color: 'var(--color-gray-600)', fontSize: '0.9rem' }}>
          Question {Math.min(answeredCount + 1, totalQuestions)} of {totalQuestions}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {ASSESSMENT_QUESTIONS.map((q) => (
            <fieldset key={q.id} className="assessment-question" style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                Q{q.id}. {q.question}
              </legend>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {q.choices.map((c) => (
                  <label key={c.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name={`q${q.id}`}
                      value={c.value}
                      checked={answers[q.id] === c.value}
                      onChange={() => setAnswer(q.id, c.value)}
                    />
                    <span>{c.value}) {c.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Assessment'}
      </button>
    </form>
  );
}
