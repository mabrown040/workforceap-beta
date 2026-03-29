'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PROGRAMS, getProgramBySlug } from '@/lib/content/programs';
import type { Program } from '@/lib/content/programs';
import { ProgramIcon } from '@/components/ProgramIcon';
import { scoreQuiz, type QuizAnswers, type CategoryWeights } from '@/lib/content/quizScoring';
import { getFitReasoning, getTopFitSummary } from '@/lib/content/quizReasoning';
import { getProgramExtra } from '@/lib/content/programExtras';
import { salaryRangeDisplay } from '@/lib/content/programSalaryOutcomes';
import ProgramsDecisionJourneyNav from '@/components/ProgramsDecisionJourneyNav';

const QUIZ_STORAGE_KEY = 'find_your_path_results';

const INTEREST_ICONS: Record<string, string> = {
  computers: 'computer',
  health: 'health_and_safety',
  building: 'construction',
  managing: 'groups',
  data: 'query_stats',
  not_sure: 'explore',
};

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

function getTopPrograms(weights: CategoryWeights, answers?: QuizAnswers): Program[] {
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
  const top3 = scored.slice(0, 3).map((s) => s.program);
  const digital = getProgramBySlug('digital-literacy-empowerment-class');
  const prioritizeDigital =
    answers && (answers.q5 === 'basics' || answers.q5 === 'basic_apps') && digital;
  if (!prioritizeDigital || !digital) return top3;
  if (top3.some((p) => p.slug === digital.slug)) return top3;
  return [digital, top3[0], top3[1]];
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
          const salaryBand = salaryRangeDisplay(program);
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
              {extra?.rampNote && (
                <p className="quiz-result-ramp-note">{extra.rampNote}</p>
              )}
              <div style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>
                ⏱ {program.duration}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-accent)', fontWeight: 600, marginBottom: '0.5rem' }}>
                Starting range: {salaryBand} <span style={{ fontWeight: 500, color: 'var(--color-on-surface-variant)' }}>(national framing)</span>
              </div>
              {extra?.jobOutcomes && extra.jobOutcomes.length > 0 && (
                <p className="quiz-result-roles">
                  <strong>Roles:</strong> {extra.jobOutcomes.join(' · ')}
                </p>
              )}
              <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
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
            Your top match: <strong>{topProgram.title}</strong>. Published starting band is {salaryRangeDisplay(topProgram)} — your offer still depends on employer and proof.
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
        <p>
          On the comparison page, check up to four tracks to see them side-by-side — time, difficulty, salary band, and best-for
          notes. Then use the salary guide for the same published ranges.
        </p>
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
              style={{ color: 'var(--color-primary)', borderColor: 'var(--outline-variant)' }}
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
      <p className="quiz-results-note">All programs are available at no cost to members.</p>
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

  const advanceFromAnswer = (value: QuizAnswers[keyof QuizAnswers]) => {
    if (!currentQ) return;
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);
    setDirection('next');

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      const fullAnswers = newAnswers as QuizAnswers;
      const weights = scoreQuiz(fullAnswers);
      const top3 = getTopPrograms(weights, fullAnswers);
      setStoredResults(top3);
      try {
        localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(top3.map((p) => p.slug)));
      } catch {
        // ignore
      }
    }
  };

  const handleSelect = (value: QuizAnswers[keyof QuizAnswers]) => {
    advanceFromAnswer(value);
  };

  const handleBack = () => {
    setDirection('prev');
    if (step > 0) {
      setStep(step - 1);
    }
  };

  if (storedResults && step === QUESTIONS.length - 1 && currentAnswer) {
    return (
      <>
        <ProgramsDecisionJourneyNav current="quiz" quizPhase="results" />
        <QuizResultsView programs={storedResults} answers={answers as QuizAnswers} />
      </>
    );
  }

  if (storedResults && step === 0 && Object.keys(answers).length === 0) {
    return (
      <>
        <ProgramsDecisionJourneyNav current="quiz" quizPhase="results" />
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
      </>
    );
  }

  const progressPct = ((step + 1) / QUESTIONS.length) * 100;
  const stepLabel = String(step + 1).padStart(2, '0');

  return (
    <>
      <ProgramsDecisionJourneyNav current="quiz" quizPhase="in_progress" />

      <div className={`quiz-flow ${direction === 'prev' ? 'quiz-slide-prev' : 'quiz-slide-next'}`}>
        {/* Step + progress indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem',
        }}>
          <span style={{
            fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-accent)',
            whiteSpace: 'nowrap', letterSpacing: '0.04em',
          }}>
            Step {stepLabel}/{String(QUESTIONS.length).padStart(2, '0')}
          </span>
          <div style={{
            flex: 1, height: '4px', background: 'var(--surface-container-highest)',
            borderRadius: '2px', overflow: 'hidden',
          }}>
            <div style={{
              width: `${progressPct}%`, height: '100%',
              background: 'var(--color-accent)',
              borderRadius: '2px',
              transition: 'width 0.35s ease',
            }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
            {Math.round(progressPct)}%
          </span>
        </div>

        {/* Quiz card */}
        <div style={{
          background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)',
          padding: '2rem', border: '1px solid var(--surface-container-highest)',
        }}>
          <h2 className="quiz-question" style={{ marginBottom: '1.5rem' }}>{currentQ?.question}</h2>
          <div className="quiz-answers" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {currentQ?.answers.map((a) => {
              const inputId = `${currentQ.id}-${a.value}`;
              const icon = currentQ.id === 'q1' ? INTEREST_ICONS[a.value] : null;
              return (
                <label
                  key={a.value}
                  htmlFor={inputId}
                  className={`quiz-answer-card ${currentAnswer === a.value ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSelect(a.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(a.value);
                    }
                  }}
                  tabIndex={0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.875rem 1rem',
                    background: currentAnswer === a.value ? 'rgba(173,44,77,0.15)' : 'var(--surface-container-low)',
                    border: currentAnswer === a.value ? '1px solid var(--color-accent)' : '1px solid var(--surface-container-highest)',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    id={inputId}
                    type="radio"
                    name={currentQ.id}
                    value={a.value}
                    checked={currentAnswer === a.value}
                    readOnly
                    tabIndex={-1}
                    aria-hidden="true"
                    style={{ display: 'none' }}
                  />
                  {icon && (
                    <span className="material-symbols-outlined" style={{
                      fontSize: '1.25rem',
                      color: currentAnswer === a.value ? 'var(--color-accent)' : 'var(--color-on-surface-variant)',
                    }}>{icon}</span>
                  )}
                  <span className="radio-dot" aria-hidden style={{ display: 'none' }} />
                  <span style={{ fontSize: '0.9rem' }}>{a.label}</span>
                </label>
              );
            })}
          </div>

          {/* Back / Continue buttons */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '1.5rem', paddingTop: '1rem',
            borderTop: '1px solid var(--surface-container-highest)',
          }}>
            {step > 0 ? (
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={handleBack}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_back</span>
                Back
              </button>
            ) : <span />}
            <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
              Select an option to continue
            </span>
          </div>
        </div>

        {/* Vertical side progress (desktop) — rendered below on mobile, could be positioned via CSS */}
        <div style={{
          display: 'flex', gap: '2rem', marginTop: '2rem',
          flexWrap: 'wrap',
        }}>
          {['Interest', 'Experience', 'Timeline', 'Values', 'Tech Comfort'].map((label, i) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <div style={{
                width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 700,
                background: i <= step ? 'var(--color-accent)' : 'var(--surface-container-highest)',
                color: i <= step ? 'white' : 'var(--color-on-surface-variant)',
                transition: 'all 0.2s ease',
              }}>{i + 1}</div>
              <span style={{
                fontSize: '0.75rem',
                color: i === step ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)',
                fontWeight: i === step ? 700 : 400,
              }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
