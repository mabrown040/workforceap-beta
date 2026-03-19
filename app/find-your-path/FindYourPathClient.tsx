'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PROGRAMS, getProgramBySlug } from '@/lib/content/programs';
import type { Program } from '@/lib/content/programs';

const QUIZ_STORAGE_KEY = 'find_your_path_results';

type CategoryKey = 'IT & Cybersecurity' | 'AI & Software Dev' | 'Cloud & Data' | 'Business' | 'Healthcare' | 'Manufacturing' | 'Digital Literacy';

const CATEGORY_WEIGHTS: Record<CategoryKey, number> = {
  'IT & Cybersecurity': 0,
  'AI & Software Dev': 0,
  'Cloud & Data': 0,
  'Business': 0,
  'Healthcare': 0,
  'Manufacturing': 0,
  'Digital Literacy': 0,
};

const CATEGORY_TO_PROGRAM_CATEGORY: Record<CategoryKey, string> = {
  'IT & Cybersecurity': 'it-cyber',
  'AI & Software Dev': 'ai-software',
  'Cloud & Data': 'cloud-data',
  'Business': 'business',
  'Healthcare': 'healthcare',
  'Manufacturing': 'manufacturing',
  'Digital Literacy': 'digital-literacy',
};

const QUESTIONS = [
  {
    id: 1,
    question: "What interests you most?",
    answers: [
      { label: "Working with computers and technology", key: "computers" },
      { label: "Helping people with their health", key: "health" },
      { label: "Building and making things with your hands", key: "building" },
      { label: "Managing projects and teams", key: "managing" },
      { label: "Working with data and numbers", key: "data" },
      { label: "I'm not sure yet — show me everything", key: "not_sure" },
    ],
  },
  {
    id: 2,
    question: "What's your experience level?",
    answers: [
      { label: "I'm brand new — no experience in this field", key: "brand_new" },
      { label: "I have some basic knowledge but no credentials", key: "some_knowledge" },
      { label: "I have work experience but no formal certification", key: "work_experience" },
      { label: "I have certifications but want to level up", key: "certifications" },
    ],
  },
  {
    id: 3,
    question: "How quickly do you want to start working?",
    answers: [
      { label: "As fast as possible — I need a job soon", key: "as_fast" },
      { label: "I can invest 3–5 months in training", key: "3_5_months" },
      { label: "I'm planning ahead — no rush", key: "planning_ahead" },
      { label: "I'm currently employed but want to switch careers", key: "employed" },
    ],
  },
  {
    id: 4,
    question: "What matters most to you in a career?",
    answers: [
      { label: "Highest salary potential", key: "salary" },
      { label: "Job stability and demand", key: "stability" },
      { label: "Working remotely or from home", key: "remote" },
      { label: "Making a difference in my community", key: "community" },
      { label: "Working with my hands, not just a screen", key: "hands" },
    ],
  },
  {
    id: 5,
    question: "What's your comfort level with technology?",
    answers: [
      { label: "I'm comfortable with computers, email, and the internet", key: "comfortable" },
      { label: "I can use a phone and basic apps but computers are tricky", key: "basic_apps" },
      { label: "I'm very tech-savvy — I just need the credential", key: "tech_savvy" },
      { label: "I need to start from the basics", key: "basics" },
    ],
  },
];

function applyWeights(weights: Record<CategoryKey, number>, answer: string, qIndex: number): void {
  if (qIndex === 0) {
    if (answer === "computers") {
      weights["IT & Cybersecurity"] += 3;
      weights["AI & Software Dev"] += 2;
    } else if (answer === "health") {
      weights["Healthcare"] += 4;
    } else if (answer === "building") {
      weights["Manufacturing"] += 4;
    } else if (answer === "managing") {
      weights["Business"] += 3;
    } else if (answer === "data") {
      weights["Cloud & Data"] += 3;
      weights["AI & Software Dev"] += 2;
    } else if (answer === "not_sure") {
      (Object.keys(weights) as CategoryKey[]).forEach((k) => (weights[k] += 1));
    }
  } else if (qIndex === 1) {
    if (answer === "brand_new") {
      weights["Digital Literacy"] += 2;
    } else if (answer === "some_knowledge") {
      ["IT & Cybersecurity", "Business", "Healthcare"].forEach((k) => (weights[k as CategoryKey] += 1));
    } else if (answer === "work_experience") {
      ["AI & Software Dev", "Cloud & Data"].forEach((k) => (weights[k as CategoryKey] += 1));
    } else if (answer === "certifications") {
      ["AI & Software Dev", "Cloud & Data"].forEach((k) => (weights[k as CategoryKey] += 2));
    }
  } else if (qIndex === 2) {
    if (answer === "as_fast") {
      weights["Digital Literacy"] += 2;
      weights["IT & Cybersecurity"] += 1; // CompTIA A+ is shorter
    } else if (answer === "3_5_months") {
      (Object.keys(weights) as CategoryKey[]).forEach((k) => (weights[k] += 1));
    } else if (answer === "planning_ahead") {
      ["AI & Software Dev", "Cloud & Data", "Healthcare"].forEach((k) => (weights[k as CategoryKey] += 1));
    }
  } else if (qIndex === 3) {
    if (answer === "salary") {
      weights["Cloud & Data"] += 2;
      weights["AI & Software Dev"] += 2;
    } else if (answer === "stability") {
      weights["IT & Cybersecurity"] += 2;
      weights["Healthcare"] += 1;
    } else if (answer === "remote") {
      weights["Cloud & Data"] += 1;
      weights["AI & Software Dev"] += 1;
      weights["Business"] += 1;
    } else if (answer === "community") {
      weights["Healthcare"] += 1;
      weights["Manufacturing"] += 1;
    } else if (answer === "hands") {
      weights["Manufacturing"] += 3;
    }
  } else if (qIndex === 4) {
    if (answer === "basic_apps") {
      weights["Digital Literacy"] += 2;
    } else if (answer === "tech_savvy") {
      weights["AI & Software Dev"] += 2;
      weights["Cloud & Data"] += 1;
    } else if (answer === "basics") {
      weights["Digital Literacy"] += 3;
    }
  }
}

function parseSalaryForSort(salaryStr: string): number {
  const match = salaryStr.match(/\$(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function getTopPrograms(weights: Record<CategoryKey, number>): Program[] {
  const scored = (Object.entries(weights) as [CategoryKey, number][])
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1]);

  const seen = new Set<string>();
  const result: Program[] = [];

  for (const [cat] of scored) {
    const programCat = CATEGORY_TO_PROGRAM_CATEGORY[cat];
    const inCat = PROGRAMS.filter((p) => p.category === programCat);
    const sorted = [...inCat].sort((a, b) => parseSalaryForSort(b.salary) - parseSalaryForSort(a.salary));
    for (const p of sorted) {
      if (!seen.has(p.slug)) {
        seen.add(p.slug);
        result.push(p);
      }
    }
  }

  if (result.length === 0) {
    return [...PROGRAMS].sort((a, b) => parseSalaryForSort(b.salary) - parseSalaryForSort(a.salary)).slice(0, 3);
  }

  return result.slice(0, 3);
}

export default function FindYourPathClient() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [results, setResults] = useState<Program[] | null>(null);
  const [storedResults, setStoredResults] = useState<Program[] | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(QUIZ_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.slugs) && data.slugs.length > 0) {
          const progs = data.slugs.map((s: string) => getProgramBySlug(s)).filter(Boolean) as Program[];
          if (progs.length > 0) setStoredResults(progs);
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
      const weights = { ...CATEGORY_WEIGHTS };
      newAnswers.forEach((a, i) => applyWeights(weights, a, i));
      const top = getTopPrograms(weights);
      setResults(top);
      try {
        localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ slugs: top.map((p) => p.slug), at: Date.now() }));
      } catch {
        // ignore
      }
    } else {
      setStep(newAnswers.length);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setAnswers(answers.slice(0, step - 1));
    }
  };

  const handleRetake = () => {
    setStep(0);
    setAnswers([]);
    setResults(null);
    setStoredResults(null);
    try {
      localStorage.removeItem(QUIZ_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  if (storedResults && !results && answers.length === 0) {
    return (
      <div className="find-your-path-results">
        <h2>Your Previous Results</h2>
        <p style={{ marginBottom: "1.5rem", color: "var(--color-gray-600)" }}>
          Based on your last quiz, here are the programs we recommended:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
          {storedResults.map((p, i) => (
            <div
              key={p.slug}
              style={{
                padding: "1.25rem",
                border: "1px solid var(--color-border, #e5e5e5)",
                borderRadius: "var(--radius-md)",
                background: "white",
              }}
            >
              <span
                style={{
                  background: p.categoryColor,
                  color: "white",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "50px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                {p.categoryLabel}
              </span>
              <h3 style={{ marginTop: "0.5rem", fontSize: "1.1rem" }}>{p.title}</h3>
              <p style={{ fontSize: "0.9rem", color: "var(--color-gray-600)", marginTop: "0.25rem" }}>
                {p.duration} • {p.salary}
              </p>
              <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>Partner: {p.partner}</p>
              <Link
                href={`/apply?program=${p.slug}`}
                className="btn btn-primary"
                style={{ marginTop: "0.75rem", display: "inline-block" }}
              >
                Apply for This Program →
              </Link>
            </div>
          ))}
        </div>
        <Link href="/programs" className="btn btn-outline" style={{ marginRight: "0.5rem" }}>
          Browse All 19 Programs →
        </Link>
        <button type="button" className="btn btn-ghost" onClick={handleRetake}>
          Retake Quiz
        </button>
      </div>
    );
  }

  if (results && results.length > 0) {
    return (
      <div className="find-your-path-results">
        <h2>Your Top 3 Career Paths</h2>
        <p style={{ marginBottom: "1.5rem", color: "var(--color-gray-600)" }}>
          Based on your answers, here are the programs we recommend:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "2rem" }}>
          {results.map((p, i) => (
            <div
              key={p.slug}
              className="find-your-path-card"
              style={{
                padding: "1.5rem",
                border: "1px solid var(--color-border, #e5e5e5)",
                borderRadius: "var(--radius-md)",
                background: "white",
                borderLeft: `4px solid ${p.categoryColor}`,
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--color-accent)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {i === 0 ? "#1 Best Match" : i === 1 ? "#2 Strong Fit" : "#3 Also Consider"}
              </span>
              <span
                style={{
                  background: p.categoryColor,
                  color: "white",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "50px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  marginLeft: "0.5rem",
                }}
              >
                {p.categoryLabel}
              </span>
              <h3 style={{ marginTop: "0.75rem", fontSize: "1.2rem" }}>{p.title}</h3>
              <p style={{ fontSize: "0.95rem", color: "var(--color-gray-600)", marginTop: "0.25rem" }}>
                {p.duration} • {p.salary}
              </p>
              <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>Partner: {p.partner}</p>
              <Link
                href={`/apply?program=${p.slug}`}
                className="btn btn-primary"
                style={{ marginTop: "1rem", display: "inline-block" }}
              >
                Apply for This Program →
              </Link>
            </div>
          ))}
        </div>
        <p style={{ marginBottom: "1rem", color: "var(--color-gray-600)" }}>Not seeing what you expected?</p>
        <Link href="/programs" className="btn btn-outline" style={{ marginRight: "0.5rem" }}>
          Browse All 19 Programs →
        </Link>
        <button type="button" className="btn btn-ghost" onClick={handleRetake}>
          Retake Quiz
        </button>
        <p style={{ marginTop: "1.5rem", fontSize: "0.9rem", color: "var(--color-gray-500)" }}>
          All programs are available at no cost to qualifying participants.
        </p>
      </div>
    );
  }

  const q = QUESTIONS[step];
  if (!q) return null;

  return (
    <div className="find-your-path-quiz">
      <p className="find-your-path-progress">Question {step + 1} of 5</p>
      <div className="find-your-path-progress-bar">
        <div
          className="find-your-path-progress-fill"
          style={{ width: `${((step + 1) / 5) * 100}%` }}
        />
      </div>
      {step > 0 && (
        <button
          type="button"
          className="find-your-path-back"
          onClick={handleBack}
        >
          <ChevronLeft size={18} /> Back
        </button>
      )}
      <h2 className="find-your-path-question">{q.question}</h2>
      <div className="find-your-path-answers">
        {q.answers.map((a) => (
          <button
            key={a.key}
            type="button"
            className="find-your-path-answer-card"
            onClick={() => handleAnswer(a.key)}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
