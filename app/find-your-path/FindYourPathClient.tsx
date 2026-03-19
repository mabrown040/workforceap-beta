'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PROGRAMS } from '@/lib/content/programs';
import { getProgramIcon } from '@/lib/content/programIcons';
import type { Program } from '@/lib/content/programs';

const QUIZ_STORAGE_KEY = 'find_your_path_results';

const QUESTIONS = [
  {
    id: 1,
    question: "What interests you most?",
    options: [
      { label: 'Working with computers and technology', key: 'computers' },
      { label: 'Helping people with their health', key: 'health' },
      { label: 'Building and making things with your hands', key: 'hands' },
      { label: 'Managing projects and teams', key: 'projects' },
      { label: 'Working with data and numbers', key: 'data' },
      { label: "I'm not sure yet — show me everything", key: 'not_sure' },
    ],
  },
  {
    id: 2,
    question: "What's your experience level?",
    options: [
      { label: "I'm brand new — no experience in this field", key: 'brand_new' },
      { label: 'I have some basic knowledge but no credentials', key: 'some_knowledge' },
      { label: 'I have work experience but no formal certification', key: 'work_exp' },
      { label: 'I have certifications but want to level up', key: 'certs' },
    ],
  },
  {
    id: 3,
    question: 'How quickly do you want to start working?',
    options: [
      { label: 'As fast as possible — I need a job soon', key: 'fast' },
      { label: 'I can invest 3–5 months in training', key: '3_5_months' },
      { label: "I'm planning ahead — no rush", key: 'planning' },
      { label: "I'm currently employed but want to switch careers", key: 'employed' },
    ],
  },
  {
    id: 4,
    question: 'What matters most to you in a career?',
    options: [
      { label: 'Highest salary potential', key: 'salary' },
      { label: 'Job stability and demand', key: 'stability' },
      { label: 'Working remotely or from home', key: 'remote' },
      { label: 'Making a difference in my community', key: 'community' },
      { label: 'Working with my hands, not just a screen', key: 'hands_career' },
    ],
  },
  {
    id: 5,
    question: "What's your comfort level with technology?",
    options: [
      { label: "I'm comfortable with computers, email, and the internet", key: 'comfortable' },
      { label: 'I can use a phone and basic apps but computers are tricky', key: 'basic_apps' },
      { label: "I'm very tech-savvy — I just need the credential", key: 'tech_savvy' },
      { label: "I need to start from the basics", key: 'basics' },
    ],
  },
];

const CATEGORY_KEYS = ['it-cyber', 'ai-software', 'cloud-data', 'business', 'healthcare', 'manufacturing', 'digital-literacy'] as const;

function applyWeights(weights: Record<string, number>, answers: string[]): Record<string, number> {
  const w = { ...weights };
  const [q1, q2, q3, q4, q5] = answers;

  // Q1
  if (q1 === 'computers') {
    w['it-cyber'] = (w['it-cyber'] ?? 0) + 3;
    w['ai-software'] = (w['ai-software'] ?? 0) + 2;
  } else if (q1 === 'health') {
    w['healthcare'] = (w['healthcare'] ?? 0) + 4;
  } else if (q1 === 'hands') {
    w['manufacturing'] = (w['manufacturing'] ?? 0) + 4;
  } else if (q1 === 'projects') {
    w['business'] = (w['business'] ?? 0) + 3;
  } else if (q1 === 'data') {
    w['cloud-data'] = (w['cloud-data'] ?? 0) + 3;
    w['ai-software'] = (w['ai-software'] ?? 0) + 2;
  } else if (q1 === 'not_sure') {
    CATEGORY_KEYS.forEach((c) => { w[c] = (w[c] ?? 0) + 1; });
  }

  // Q2
  if (q2 === 'brand_new') {
    w['digital-literacy'] = (w['digital-literacy'] ?? 0) + 2;
  } else if (q2 === 'some_knowledge') {
    ['it-cyber', 'business', 'healthcare'].forEach((c) => { w[c] = (w[c] ?? 0) + 1; });
  } else if (q2 === 'work_exp') {
    ['cloud-data', 'ai-software'].forEach((c) => { w[c] = (w[c] ?? 0) + 1; });
  } else if (q2 === 'certs') {
    ['cloud-data', 'ai-software', 'it-cyber'].forEach((c) => { w[c] = (w[c] ?? 0) + 2; });
  }

  // Q3
  if (q3 === 'fast') {
    w['digital-literacy'] = (w['digital-literacy'] ?? 0) + 2;
    w['it-cyber'] = (w['it-cyber'] ?? 0) + 1; // CompTIA A+ is shorter
  } else if (q3 === '3_5_months') {
    CATEGORY_KEYS.forEach((c) => { w[c] = (w[c] ?? 0) + 1; });
  } else if (q3 === 'planning') {
    ['cloud-data', 'ai-software', 'business'].forEach((c) => { w[c] = (w[c] ?? 0) + 1; });
  }

  // Q4
  if (q4 === 'salary') {
    w['cloud-data'] = (w['cloud-data'] ?? 0) + 2;
    w['ai-software'] = (w['ai-software'] ?? 0) + 2;
  } else if (q4 === 'stability') {
    w['it-cyber'] = (w['it-cyber'] ?? 0) + 2;
    w['healthcare'] = (w['healthcare'] ?? 0) + 1;
  } else if (q4 === 'remote') {
    w['cloud-data'] = (w['cloud-data'] ?? 0) + 1;
    w['ai-software'] = (w['ai-software'] ?? 0) + 1;
    w['business'] = (w['business'] ?? 0) + 1;
  } else if (q4 === 'community') {
    w['healthcare'] = (w['healthcare'] ?? 0) + 1;
    w['manufacturing'] = (w['manufacturing'] ?? 0) + 1;
  } else if (q4 === 'hands_career') {
    w['manufacturing'] = (w['manufacturing'] ?? 0) + 3;
  }

  // Q5
  if (q5 === 'basic_apps') {
    w['digital-literacy'] = (w['digital-literacy'] ?? 0) + 2;
  } else if (q5 === 'tech_savvy') {
    w['ai-software'] = (w['ai-software'] ?? 0) + 2;
    w['cloud-data'] = (w['cloud-data'] ?? 0) + 1;
  } else if (q5 === 'basics') {
    w['digital-literacy'] = (w['digital-literacy'] ?? 0) + 3;
  }

  return w;
}

function parseSalaryNum(salary: string): number {
  const m = salary.match(/\$(\d+)K/);
  return m ? parseInt(m[1], 10) : 0;
}

function getTopPrograms(answers: string[]): Program[] {
  const weights: Record<string, number> = {};
  CATEGORY_KEYS.forEach((c) => { weights[c] = 0; });
  const final = applyWeights(weights, answers);

  const scored = PROGRAMS.map((p) => ({
    program: p,
    score: final[p.category] ?? 0,
    salaryNum: parseSalaryNum(p.salary),
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.salaryNum - a.salaryNum;
  });

  return scored.slice(0, 3).map((s) => s.program);
}

export default function FindYourPathClient() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [results, setResults] = useState<Program[] | null>(null);
  const [showStored, setShowStored] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(QUIZ_STORAGE_KEY);
      if (stored) {
        const { programs: slugs } = JSON.parse(stored);
        if (Array.isArray(slugs) && slugs.length > 0) {
          const progs = slugs
            .map((s: string) => PROGRAMS.find((p) => p.slug === s))
            .filter(Boolean) as Program[];
          if (progs.length > 0) {
            setResults(progs);
            setShowStored(true);
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleAnswer = (key: string) => {
    const newAnswers = [...answers, key];
    setAnswers(newAnswers);

    if (newAnswers.length >= 5) {
      const top = getTopPrograms(newAnswers);
      setResults(top);
      setStep(5);
      try {
        localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({
          programs: top.map((p) => p.slug),
          at: new Date().toISOString(),
        }));
      } catch {
        // ignore
      }
    } else {
      setStep(newAnswers.length);
    }
  };

  const handleBack = () => {
    if (step > 0 && step < 5) {
      setStep(step - 1);
      setAnswers(answers.slice(0, step - 1));
    }
  };

  const handleRetake = () => {
    setStep(0);
    setAnswers([]);
    setResults(null);
    setShowStored(false);
    try {
      localStorage.removeItem(QUIZ_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  if (results && showStored && step === 0) {
    return (
      <div className="quiz-results-section">
        <h2>Your Top 3 Career Paths</h2>
        <p style={{ marginBottom: '1.5rem', color: 'var(--color-gray-600)' }}>
          Based on your previous answers, here are the programs we recommend:
        </p>
        <div className="quiz-results-grid">
          {results.map((p, i) => (
            <QuizProgramCard key={p.slug} program={p} rank={i + 1} />
          ))}
        </div>
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" onClick={handleRetake} className="btn btn-outline">
            Retake Quiz
          </button>
          <Link href="/programs" className="btn btn-primary">
            Browse All 19 Programs →
          </Link>
        </div>
        <p style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--color-gray-600)', fontSize: '0.9rem' }}>
          All programs are available at no cost to qualifying participants.
        </p>
      </div>
    );
  }

  if (results && step === 5) {
    return (
      <div className="quiz-results-section">
        <h2>Your Top 3 Career Paths</h2>
        <p style={{ marginBottom: '1.5rem', color: 'var(--color-gray-600)' }}>
          Based on your answers, here are the programs we recommend:
        </p>
        <div className="quiz-results-grid">
          {results.map((p, i) => (
            <QuizProgramCard key={p.slug} program={p} rank={i + 1} />
          ))}
        </div>
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <p style={{ marginBottom: '1rem', color: 'var(--color-gray-600)' }}>Not seeing what you expected?</p>
          <Link href="/programs" className="btn btn-outline">
            Browse All 19 Programs →
          </Link>
        </div>
        <p style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--color-gray-600)', fontSize: '0.9rem' }}>
          All programs are available at no cost to qualifying participants.
        </p>
      </div>
    );
  }

  const q = QUESTIONS[step];
  return (
    <div className="quiz-flow">
      <div className="quiz-progress-bar">
        <div
          className="quiz-progress-fill"
          style={{ width: `${((step + 1) / 5) * 100}%` }}
        />
        <p className="quiz-progress-label">Question {step + 1} of 5</p>
      </div>

      <div className="quiz-step-content">
        {step > 0 && (
          <button
            type="button"
            onClick={handleBack}
            className="quiz-back-link"
          >
            ← Back
          </button>
        )}
        <h2 className="quiz-step-title">{q.question}</h2>
        <div className="quiz-options">
          {q.options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className="quiz-option-card"
              onClick={() => handleAnswer(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuizProgramCard({ program, rank }: { program: Program; rank: number }) {
  const Icon = getProgramIcon(program.category);
  const rankLabel = rank === 1 ? 'Best Match' : rank === 2 ? 'Strong Fit' : 'Also Consider';

  return (
    <div className="quiz-program-card">
      <span className="quiz-program-rank">#{rank} {rankLabel}</span>
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
          <Icon size={28} className="text-current" />
        </span>
      </div>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{program.title}</h3>
      <div style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', marginBottom: '0.5rem' }}>
        ⏱ {program.duration}
      </div>
      <div style={{ fontSize: '0.9rem', color: 'var(--color-accent)', fontWeight: 600, marginBottom: '0.5rem' }}>
        {program.salary}
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', marginBottom: '1rem' }}>
        Partner: {program.partner}
      </div>
      <Link href={`/apply?program=${program.slug}`} className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
        Apply for This Program →
      </Link>
    </div>
  );
}
