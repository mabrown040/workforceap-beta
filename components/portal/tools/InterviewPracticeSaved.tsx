'use client';

import { useState } from 'react';
import Link from 'next/link';

type Question = {
  question?: string;
  type?: string;
  tip?: string;
  starHint?: string;
  exampleAnswer?: string;
};

type SavedResult = {
  id: string;
  inputSummary: string;
  output: string;
  createdAt: Date;
};

export default function InterviewPracticeSaved({ results }: { results: SavedResult[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (results.length === 0) return null;

  return (
    <div className="interview-practice-saved">
      <h3 className="interview-practice-saved-title">Saved sessions</h3>
      <p className="interview-practice-saved-hint">
        Revisit past question sets. <Link href="/ai-tools/history?tool=interview_practice">View all in history</Link>
      </p>
      <ul className="interview-practice-saved-list">
        {results.map((r) => {
          let questions: Question[] = [];
          try {
            questions = JSON.parse(r.output) as Question[];
            if (!Array.isArray(questions)) questions = [];
          } catch {
            // ignore
          }
          const isExpanded = expandedId === r.id;
          return (
            <li key={r.id} className="interview-practice-saved-item">
              <button
                type="button"
                className="interview-practice-saved-header"
                onClick={() => setExpandedId(isExpanded ? null : r.id)}
              >
                <span className="interview-practice-saved-summary">{r.inputSummary}</span>
                <span className="interview-practice-saved-date">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
                <span className="interview-practice-saved-chevron" aria-hidden>
                  {isExpanded ? '▼' : '▶'}
                </span>
              </button>
              {isExpanded && (
                <div className="interview-practice-saved-content">
                  <ol className="interview-practice-list">
                    {questions.map((q, i) => (
                      <li key={i} className="interview-practice-item">
                        <div className="interview-practice-question">{q.question}</div>
                        {q.type && (
                          <span className={`interview-practice-type type-${q.type}`}>{q.type}</span>
                        )}
                        {q.tip && <p className="interview-practice-tip">{q.tip}</p>}
                        {q.starHint && (
                          <p className="interview-practice-star">STAR hint: {q.starHint}</p>
                        )}
                        {q.exampleAnswer && (
                          <div className="interview-practice-example">
                            <strong>Example:</strong> {q.exampleAnswer}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
