'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PROGRAMS, getProgramBySlug } from '@/lib/content/programs';
import { getProgramIcon } from '@/lib/content/programIcons';
import {
  QUESTIONS,
  computeScores,
  parseSalaryNum,
  PROGRAM_TO_QUIZ_CATEGORY,
  type QuizAnswers,
  type Q1Answer,
  type Q2Answer,
  type Q3Answer,
  type Q4Answer,
  type Q5Answer,
} from './quizData';

const STORAGE_KEY = 'find_your_path_results';

type QuizStep = 1 | 2 | 3 | 4 | 5 | 'results';

export default function FindYourPathClient() {
  const [step, setStep] = useState<QuizStep>(1);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [results, setResults] = useState<typeof PROGRAMS>([]);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  // Check for stored results on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { slugs } = JSON.parse(stored);
        const programs = slugs
          .map((s: string) => getProgramBySlug(s))
          .filter(Boolean) as typeof PROGRAMS;
        if (programs.length >= 3) {
          setResults(programs);
          setStep('results');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const currentQuestion = QUESTIONS[step === 'results' ? 4 : (step as number) - 1];

  const handleAnswer = (value: Q1Answer | Q2Answer | Q3Answer | Q4Answer | Q5Answer) => {
    const key = `q${step}` as keyof QuizAnswers;
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setDirection('forward');

    if (step === 5) {
      const fullAnswers = { ...answers, [key]: value } as QuizAnswers;
      const scores = computeScores(fullAnswers);

      // Map programs to (program, score) and sort by score desc, then salary desc
      const programScores = PROGRAMS.map((p) => {
        const quizCat = PROGRAM_TO_QUIZ_CATEGORY[p.category];
        const score = quizCat ? scores[quizCat] : 0;
        const salaryNum = parseSalaryNum(p.salary);
        return { program: p, score, salaryNum };
      });

      const sorted = programScores
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return b.salaryNum - a.salaryNum;
        })
        .slice(0, 3)
        .map((x) => x.program);

      setResults(sorted);
      setStep('results');

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            slugs: sorted.map((p) => p.slug),
            at: new Date().toISOString(),
          })
        );
      }
    } else {
      setStep(((step as number) + 1) as QuizStep);
    }
  };

  const handleBack = () => {
    setDirection('back');
    if (step === 'results') {
      setStep(5);
    } else if (typeof step === 'number' && step > 1) {
      setStep((step - 1) as QuizStep);
    }
  };

  const handleRetake = () => {
    setStep(1);
    setAnswers({});
    setResults([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  if (step === 'results') {
    return (
      <>
        <section className="page-hero">
          <div className="page-hero-content">
            <h1>Find Your Path</h1>
            <p>Your personalized career recommendations</p>
          </div>
        </section>
        <section className="content-section find-your-path-results">
        <div className="container">
          <h1 className="find-your-path-title">Your Top 3 Career Paths</h1>
          <p className="find-your-path-subtitle">
            Based on your answers, here are the programs we recommend:
          </p>

          <div className="find-your-path-results-grid">
            {results.map((program, i) => {
              const labels = ['Best Match', 'Strong Fit', 'Also Consider'];
              const ProgramIcon = getProgramIcon(program);
              return (
                <div key={program.slug} className="find-your-path-result-card">
                  <span className="find-your-path-result-badge">#{i + 1} {labels[i]}</span>
                  <div className="find-your-path-result-header">
                    <span
                      style={{
                        background: program.categoryColor,
                        color: 'white',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '50px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {program.categoryLabel}
                    </span>
                    <ProgramIcon size={28} className="text-current" />
                  </div>
                  <h3>{program.title}</h3>
                  <div className="find-your-path-result-meta">
                    <span>{program.duration}</span>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                      {program.salary}
                    </span>
                  </div>
                  <p className="find-your-path-result-partner">Partner: {program.partner}</p>
                  <Link
                    href={`/apply?program=${program.slug}`}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '1rem' }}
                  >
                    Apply for This Program →
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="find-your-path-results-footer">
            <p>Not seeing what you expected?</p>
            <Link href="/programs" className="btn btn-outline">
              Browse All 19 Programs →
            </Link>
          </div>
          <p className="find-your-path-disclaimer">
            All programs are available at no cost to qualifying participants.
          </p>
          <button
            type="button"
            onClick={handleRetake}
            className="find-your-path-retake"
          >
            ← Retake quiz
          </button>
        </div>
      </section>
      </>
    );
  }

  return (
    <>
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Find Your Path</h1>
          <p>Answer 5 quick questions to discover which career program fits you best.</p>
        </div>
      </section>
      <section className="content-section find-your-path">
      <div className="container">
        <div className="find-your-path-progress">
          <div
            className="find-your-path-progress-fill"
            style={{ width: `${(step as number) * 20}%` }}
          />
          <p className="find-your-path-progress-label">
            Question {step} of 5
          </p>
        </div>

        <div
          className={`find-your-path-question ${direction === 'back' ? 'slide-from-right' : 'slide-from-left'}`}
          key={step}
        >
          <h1 className="find-your-path-question-title">{currentQuestion.question}</h1>

          <div className="find-your-path-answers">
            {currentQuestion.answers.map((opt) => {
              const key = `q${step}` as keyof QuizAnswers;
              const isSelected = answers[key] === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`find-your-path-answer-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleAnswer(opt.value)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="find-your-path-back"
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    </section>
    </>
  );
}
