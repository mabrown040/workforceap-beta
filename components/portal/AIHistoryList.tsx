'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatToolOutput } from '@/lib/ai/formatToolOutput';
import { TOOL_JOBS, TOOL_METADATA_BY_TYPE } from '@/lib/ai/toolMeta';

type Result = {
  id: string;
  toolType: string;
  toolLabel: string;
  inputSummary: string;
  output: string;
  createdAt: Date;
};

export default function AIHistoryList({ results, initialFilter = '' }: { results: Result[]; initialFilter?: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(initialFilter);

  const filtered = useMemo(() => {
    if (!filter) return results;
    return results.filter((result) => {
      const job = TOOL_METADATA_BY_TYPE[result.toolType as keyof typeof TOOL_METADATA_BY_TYPE]?.job;
      return result.toolType === filter || result.toolLabel.toLowerCase().includes(filter.toLowerCase()) || job === filter;
    });
  }, [filter, results]);

  const countsByJob = useMemo(() => filtered.reduce<Record<string, number>>((acc, result) => {
    const job = TOOL_METADATA_BY_TYPE[result.toolType as keyof typeof TOOL_METADATA_BY_TYPE]?.job ?? 'other';
    acc[job] = (acc[job] ?? 0) + 1;
    return acc;
  }, {}), [filtered]);

  const getPreview = (output: string, toolType: string, maxLen = 140) => {
    const formatted = formatToolOutput(output, toolType).replace(/\s+/g, ' ').trim();
    return formatted.length <= maxLen ? formatted : `${formatted.slice(0, maxLen)}…`;
  };

  return (
    <div className="ai-history">
      <div className="ai-history-toolbar">
        <label>
          Filter history
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All saved outputs</option>
            {TOOL_JOBS.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
            {Object.entries(TOOL_METADATA_BY_TYPE).map(([toolType, meta]) => <option key={toolType} value={toolType}>{meta.title}</option>)}
          </select>
        </label>
        <Link href="/dashboard/ai-tools" className="btn btn-outline btn-sm">Back to toolkit</Link>
      </div>

      <div className="ai-history-summary-cards">
        {TOOL_JOBS.map((job) => (
          <div key={job.id} className="ai-history-summary-card">
            <p>{job.title}</p>
            <strong>{countsByJob[job.id] ?? 0}</strong>
          </div>
        ))}
      </div>

      <ul className="ai-history-list">
        {filtered.map((result) => {
          const meta = TOOL_METADATA_BY_TYPE[result.toolType as keyof typeof TOOL_METADATA_BY_TYPE];
          const isExpanded = expandedId === result.id;
          return (
            <li key={result.id} className="ai-history-item">
              <button type="button" className="ai-history-header" onClick={() => setExpandedId(isExpanded ? null : result.id)}>
                <div className="ai-history-header-main">
                  <span className="ai-history-tool">{result.toolLabel}</span>
                  {meta && <span className="ai-history-job-tag">{TOOL_JOBS.find((job) => job.id === meta.job)?.title}</span>}
                  <span className="ai-history-summary">{result.inputSummary}</span>
                </div>
                <span className="ai-history-date">{new Date(result.createdAt).toLocaleDateString()}</span>
                <span className="ai-history-chevron">{isExpanded ? '▼' : '▶'}</span>
              </button>
              <p className="ai-history-preview">{getPreview(result.output, result.toolType)}</p>
              {isExpanded && (
                <div className="ai-history-output">
                  <pre>{formatToolOutput(result.output, result.toolType)}</pre>
                  <div className="ai-history-actions">
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => navigator.clipboard.writeText(formatToolOutput(result.output, result.toolType))}>Copy</button>
                    {meta && <Link href={meta.href} className="btn btn-primary btn-sm">Reopen tool</Link>}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
