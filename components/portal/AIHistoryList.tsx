'use client';

import { useState } from 'react';
import Link from 'next/link';

type Result = {
  id: string;
  toolType: string;
  toolLabel: string;
  inputSummary: string;
  output: string;
  createdAt: Date;
};

export default function AIHistoryList({ results }: { results: Result[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');

  const filtered = filter
    ? results.filter((r) => r.toolType === filter || r.toolLabel.toLowerCase().includes(filter.toLowerCase()))
    : results;

  const formatOutput = (output: string, toolType: string) => {
    if (toolType === 'interview_practice' || toolType === 'linkedin_headline') {
      try {
        const arr = JSON.parse(output);
        return Array.isArray(arr) ? arr.join('\n\n') : output;
      } catch {
        return output;
      }
    }
    return output;
  };

  return (
    <div className="ai-history">
      <div className="ai-history-filters">
        <label>
          Filter:
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All tools</option>
            <option value="resume_rewriter">Resume Rewriter</option>
            <option value="cover_letter">Cover Letter</option>
            <option value="interview_practice">Interview Practice</option>
            <option value="linkedin_headline">LinkedIn Headline</option>
          </select>
        </label>
      </div>
      <ul className="ai-history-list">
        {filtered.map((r) => (
          <li key={r.id} className="ai-history-item">
            <button
              type="button"
              className="ai-history-header"
              onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
            >
              <span className="ai-history-tool">{r.toolLabel}</span>
              <span className="ai-history-summary">{r.inputSummary}</span>
              <span className="ai-history-date">
                {new Date(r.createdAt).toLocaleDateString()}
              </span>
              <span className="ai-history-chevron">{expandedId === r.id ? '▼' : '▶'}</span>
            </button>
            {expandedId === r.id && (
              <div className="ai-history-output">
                <pre>{formatOutput(r.output, r.toolType)}</pre>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => navigator.clipboard.writeText(formatOutput(r.output, r.toolType))}
                >
                  Copy
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
