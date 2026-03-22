'use client';

import { useState } from 'react';
import Link from 'next/link';
import { parseInterviewQuestions } from '@/lib/ai/formatToolOutput';

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
      <h3 className="interview-practice-saved-title">Recent saved practice sets</h3>
      <p className="interview-practice-saved-hint">Your interview prep is saved automatically. <Link href="/dashboard/ai-tools/history?tool=interview_practice">View all in history</Link>.</p>
      <ul className="interview-practice-saved-list">
        {results.map((result) => {
          const questions = parseInterviewQuestions(result.output);
          const isExpanded = expandedId === result.id;
          return (
            <li key={result.id} className="interview-practice-saved-item">
              <button type="button" className="interview-practice-saved-header" onClick={() => setExpandedId(isExpanded ? null : result.id)}>
                <span className="interview-practice-saved-summary">{result.inputSummary}</span>
                <span className="interview-practice-saved-date">{new Date(result.createdAt).toLocaleDateString()}</span>
                <span className="interview-practice-saved-chevron" aria-hidden>{isExpanded ? '▼' : '▶'}</span>
              </button>
              {isExpanded && (
                <div className="interview-practice-saved-content">
                  <ol className="interview-practice-list">
                    {questions.map((question, index) => (
                      <li key={index} className="interview-practice-item">
                        <div className="interview-practice-question">{question.question}</div>
                        {question.type && <span className={`interview-practice-type type-${question.type}`}>{question.type}</span>}
                        {question.tip && <p className="interview-practice-tip">{question.tip}</p>}
                        {question.starHint && <p className="interview-practice-star">STAR hint: {question.starHint}</p>}
                        {question.exampleAnswer && <div className="interview-practice-example"><strong>Example:</strong> {question.exampleAnswer}</div>}
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
