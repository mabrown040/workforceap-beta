'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PROGRAMS, getProgramBySlug } from '@/lib/content/programs';
import type { Program } from '@/lib/content/programs';
import { ProgramIcon } from '@/components/ProgramIcon';
import { scoreQuiz, type QuizAnswers, type CategoryWeights } from '@/lib/content/quizScoring';
import { getFitReasoning, getTopFitSummary } from '@/lib/content/quizReasoning';
import { getProgramExtra } from '@/lib/content/programExtras';

const QUIZ_STORAGE_KEY = 'find_your_path_results';

const QUESTIONS = [
  {
    id: 'q1' as const,
    question: "What interests you most?",
    answers: [
      { value: 'computers' as const, label: 'Working with computers and technology' },
      { value: 'health' as const, label: 'Helping people with their health' },
      { value: 'building' as const, label: 'Building and making things with your hands' },
      { value: 'managing' as const, label: 'Managing projects and teams' },
      { value: 'data' as const, label: 'Working with data and numbers' },
      { value: 'not_sure' as const, label: "I'm not sure yet — show me everything" },
    ],
  },
  {
    id: 'q2' as const,
    question: "What's your experience level?",
    answers: [
      { value: 'brand_new' as const, label: "I'm brand new — no experience in this field" },
      { value: 'some_knowledge' as const, label: 'I have some basic knowledge but no credentials' },
      { value: 'work_experience' as const, label: 'I have work experience but no formal certification' },
      { value: 'certifications' as const, label: 'I have certifications but want to level up' },
    ],
  },
  {
    id: 'q3' as const,
    question: 'How quickly do you want to start working?',
    answers: [
      { value: 'as_fast' as const, label: 'As fast as possible — I need a job soon' },
      { value: '3_5_months' as const, label: 'I can invest 3–5 months in training' },
      { value: 'planning_ahead' as const, label: "I'm planning ahead — no rush" },
      { value: 'employed_switch' as const, label: "I'm currently employed but want to switch careers" },
    ],
  },
  {
    id: 'q4' as const,
    question: 'What matters most to you in a career?',
    answers: [
      { value: 'salary' as const, label: 'Highest salary potential' },
      { value: 'stability' as const, label: 'Job stability and demand' },
      { value: 'remote' as const, label: 'Working remotely or from home' },
      { value: 'community' as const, label: 'Making a difference in my community' },
      { value: 'hands' as const, label: 'Working with my hands, not just a screen' },
    ],
  },
  {
    id: 'q5' as const,
    question: "What's your comfort level with technology?",
    answers: [
      { value: 'comfortable' as const, label: 'I\'m comfortable with computers, email, and the internet' },
      { value: 'basic_apps' as const, label: 'I can use a phone and basic apps but computers are tricky' },
      { value: 'tech_savvy' as const, label: "I'm very tech-savvy — I just need the credential" },
      { value: 'basics' as const, label: 'I need to start from the basics' },
    ],
  },
];

const CATEGORY_BORDER: Record<string, string> = {
  'it-cyber': '#2b7bb9',
  'ai-software': '#8b4a9b',
  'cloud-data': '#0d9488',
  business: '#4a9b4f',
  healthcare: '#e11d48',
  manufacturing: '#ea580c',
  'digital-literacy': '#6b7280',
};

function getTopPrograms(weights: CategoryWeights): Program[] {
  const scored = PROGRAMS.map((p) => {
    const score = weights[p.category as keyof CategoryWeights] ?? 0;
    const salaryMatch = p.salary.match(/\$(\d+)K/);
    const salaryNum = salaryMatch ? parseInt(salaryMatch[1], 10) : 0;
    return { program: p, score, salaryNum };
  });
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.salaryNum - a.salaryNum;
  });
  return scored.slice(0, 3).map((s) => s.program);
}

// Salary stat extracted from program.salary string (e.g. "Starting salary: $85K-$135K" → "$85K-$135K")
function extractSalaryRange(salary: string): string {
  const match = salary.match(/\$[\d,]+K?\s*[-–]\s*\$[\d,]+K?/i);
  return match ? match[0] : salary.replace(/^Starting salary:\s*/i, '');
}

function QuizResultsView({
  programs,
  answers,
  isPrevious,
  onRetake,
}: {
  programs: Program[];
  answers?: QuizAnswers;
  isPrevious?: boolean;
  onRetake?: () => void;
}) {
  const topProgram = programs[0];
  return (
    <div className="quiz-results">
      <h2 className="quiz-results-title">
        {isPrevious ? 'Your Previous Results' : 'Your Top 3 Career Paths'}
      </h2>
      <p className="quiz-results-subtitle">
        {isPrevious
          ? 'Here are the programs we recommended last time:'
          : (answers ? getTopFitSummary(answers) : 'Based on your answers, here are the programs we recommend:')}
      </p>

      <div className="quiz-results-grid">
        {programs.map((program, idx) => {
          const rank = idx === 0 ? 'Best Match' : idx === 1 ? 'Strong Fit' : 'Also Consider';
          const borderColor = CATEGORY_BORDER[program.category] ?? program.categoryColor;
          const reasoning = answers ? getFitReasoning(program, answers) : null;
          const extra = getProgramExtra(program.slug);
          return (
            <div
              key={program.slug}
              className="quiz-result-card"
              style={{ borderLeft: `4px solid ${borderColor}` }}
            >
              <span className="quiz-result-rank">#{idx + 1} {rank}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span
                  style={{
                    background: program.categoryColor,
                    color: 'white',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '50px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {program.categoryLabel}
                </span>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <ProgramIcon program={program} size={24} />
                </span>
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{program.title}</h3>
              {reasoning && (
                <p className="quiz-result-reasoning">{reasoning}</p>
              )}
              <div style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', marginBottom: '0.5rem' }}>
                ⏱ {program.duration}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-accent)', fontWeight: 600, marginBottom: '0.5rem' }}>
                {program.salary}
              </div>
              {extra?.jobOutcomes && extra.jobOutcomes.length > 0 && (
                <p className="quiz-result-roles">
                  <strong>Roles:</strong> {extra.jobOutcomes.join(' · ')}
                </p>
              )}
              <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem' }}>
                Partner: {program.partner}
              </div>
              <Link
                href={`/apply?program=${program.slug}`}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem' }}
              >
                Apply for This Program →
              </Link>
              <Link
                href={`/programs/${program.slug}`}
                className="quiz-result-detail-link"
              >
                View full program details →
              </Link>
            </div>
          );
        })}
      </div>

      {/* Conversion section — confidence + clear next step */}
      {topProgram && (
        <div className="quiz-results-cta">
          <p className="quiz-results-cta-lead">
            Your top match: <strong>{topProgram.title}</strong>. Graduates average {extractSalaryRange(topProgram.salary)} in year one.
          </p>
          <p className="quiz-results-cta-sub">
            Applications take about 10 minutes. We respond within 24–48 hours.
          </p>
          <Link href={`/apply?program=${topProgram.slug}`} className="btn btn-primary btn-large">
            Apply for {topProgram.title}
          </Link>
          <p className="quiz-results-cta-phone">
            <a href="tel:+15127771808">Talk to someone first → (512) 777-1808</a>
          </p>
        </div>
      )}

      <div className="quiz-results-next-steps">
        <p>Compare programs side-by-side or see full salary ranges:</p>
        <div className="quiz-results-next-links">
          <Link href="/program-comparison">Compare programs</Link>
          <Link href="/salary-guide">Salary guide</Link>
        </div>
      </div>

      <div className="quiz-results-footer">
        {isPrevious && onRetake ? (
          <>
            <p>Want to retake the quiz?</p>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ color: 'var(--color-primary)', borderColor: 'var(--color-gray-300)' }}
              onClick={onRetake}
            >
              Retake Quiz
            </button>
          </>
        ) : (
          <>
            <p>Not seeing what you expected?</p>
            <Link href="/programs" className="btn btn-outline">
              Browse All 19 Programs →
            </Link>
          </>
        )}
      </div>
      <p className="quiz-results-note">All programs are available at no cost to qualifying participants.</p>
    </div>
  );
}

export default function FindYourPathClient() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [storedResults, setStoredResults] = useState<Program[] | null>(null);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(QUIZ_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length >= 3) {
          const programs = parsed
            .map((slug: string) => getProgramBySlug(slug))
            .filter(Boolean) as Program[];
          if (programs.length >= 3) {
            setStoredResults(programs);
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const currentQ = QUESTIONS[step];
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined;

  const handleSelect = (value: QuizAnswers[keyof QuizAnswers]) => {
    if (!currentQ) return;
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);
    setDirection('next');

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      const fullAnswers = newAnswers as QuizAnswers;
      const weights = scoreQuiz(fullAnswers);
      const top3 = getTopPrograms(weights);
      setStoredResults(top3);
      try {
        localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(top3.map((p) => p.slug)));
      } catch {
        // ignore
      }
    }
  };

  const handleBack = () => {
    setDirection('prev');
    if (step > 0) {
      setStep(step - 1);
    }
  };

  if (storedResults && step === QUESTIONS.length - 1 && currentAnswer) {
    return <QuizResultsView programs={storedResults} answers={answers as QuizAnswers} />;
  }

  if (storedResults && step === 0 && Object.keys(answers).length === 0) {
    return (
      <QuizResultsView
        programs={storedResults}
        isPrevious
        onRetake={() => {
          setStoredResults(null);
          setAnswers({});
          setStep(0);
          try {
            localStorage.removeItem(QUIZ_STORAGE_KEY);
          } catch {}
        }}
      />
    );
  }

  return (
    <div className={`quiz-flow ${direction === 'prev' ? 'quiz-slide-prev' : 'quiz-slide-next'}`}>
      <div className="quiz-progress-bar">
        <div
          className="quiz-progress-fill"
          style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
        />
        <p className="quiz-progress-label">Question {step + 1} of {QUESTIONS.length}</p>
      </div>

      <div className="quiz-step-content">
        {step > 0 && (
          <button
            type="button"
            className="quiz-back-link"
            onClick={handleBack}
          >
            ← Back
          </button>
        )}
        <h2 className="quiz-question">{currentQ?.question}</h2>
        <div className="quiz-answers">
          {currentQ?.answers.map((a) => (
            <label
              key={a.value}
              className={`quiz-answer-card ${currentAnswer === a.value ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name={currentQ.id}
                value={a.value}
                checked={currentAnswer === a.value}
                onChange={() => handleSelect(a.value)}
              />
              <span className="radio-dot" />
              <span>{a.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
