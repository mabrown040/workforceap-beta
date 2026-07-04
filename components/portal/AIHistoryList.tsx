'use client';

import { useState } from 'react';
import { formatPortalDate } from '@/lib/formatDate';
import AiResultRenderer from '@/components/portal/AiResultRenderer';

const TOOL_ICONS: Record<string, string> = {
  job_match_scorer: 'target',
  resume_analysis: 'analytics',
  resume_rewriter: 'description',
  cover_letter: 'mail',
  interview_practice: 'record_voice_over',
  interview_coach: 'forum',
  voice_interview_video: 'videocam',
  linkedin_headline: 'badge',
  linkedin_about: 'person',
  salary_negotiation: 'payments',
  gap_analyzer: 'troubleshoot',
  career_counselor: 'psychology',
  skill_assessment: 'radar',
};

const TOOL_ACCENT: Record<string, string> = {
  resume_rewriter: 'var(--color-accent)',
  cover_letter: 'var(--color-blue, #2b7bb9)',
  interview_practice: 'var(--color-green, #4a9b4f)',
  interview_coach: 'var(--color-green, #4a9b4f)',
  linkedin_headline: '#0a66c2',
  linkedin_about: '#0a66c2',
  salary_negotiation: 'var(--color-gold)',
  skill_assessment: 'var(--color-accent)',
  job_match_scorer: 'var(--color-accent)',
};

type Result = {
  id: string;
  toolType: string;
  toolLabel: string;
  inputSummary: string;
  output: string;
  createdAt: Date;
};

const FILTER_OPTIONS = [
  { value: '', label: 'All tools' },
  { value: 'resume_rewriter', label: 'Resume Rewriter' },
  { value: 'cover_letter', label: 'Cover Letter' },
  { value: 'interview_practice', label: 'Interview Practice' },
  { value: 'interview_coach', label: 'AI Interview Coach' },
  { value: 'linkedin_headline', label: 'LinkedIn Headline' },
  { value: 'linkedin_about', label: 'LinkedIn About' },
  { value: 'skill_assessment', label: 'Find skills employers want' },
  { value: 'job_match_scorer', label: 'See how you match a job' },
  { value: 'resume_analysis', label: 'Resume Analysis' },
  { value: 'salary_negotiation', label: 'Salary Negotiation' },
  { value: 'gap_analyzer', label: 'See what is missing for a job' },
  { value: 'career_counselor', label: 'AI Readiness Coach / AI Elevator Introduction' },
  { value: 'voice_interview_video', label: 'Voice Interview Recording' },
];

export default function AIHistoryList({ results, initialFilter = '' }: { results: Result[]; initialFilter?: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(initialFilter);

  const filtered = filter
    ? results.filter((r) => r.toolType === filter)
    : results;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Filter row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Filter:</span>
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setExpandedId(null); }}
          style={{ padding: '0.4rem 0.75rem', borderRadius: '0.625rem', border: '1px solid var(--outline-variant)', background: 'var(--surface-container)', color: 'var(--color-on-surface)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
        >
          {FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {filter && (
          <button
            type="button"
            onClick={() => { setFilter(''); setExpandedId(null); }}
            style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Clear
          </button>
        )}
        <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginLeft: 'auto' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Result cards */}
      {filtered.length === 0 ? (
        <div className="portal-card portal-card--flat" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>No results for this filter.</p>
        </div>
      ) : (
        filtered.map((r) => {
          const isExpanded = expandedId === r.id;
          const icon = TOOL_ICONS[r.toolType] ?? 'auto_awesome';
          const accent = TOOL_ACCENT[r.toolType] ?? 'var(--color-accent)';

          return (
            <div key={r.id} className="portal-card portal-card--flat" style={{ overflow: 'hidden', transition: 'box-shadow 0.15s' }}>
              {/* Card header */}
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={`ai-history-panel-${r.id}`}
                aria-label={isExpanded ? "Collapse details for " + r.toolLabel : "Expand details for " + r.toolLabel} onClick={() => setExpandedId(isExpanded ? null : r.id)}
                style={{ width: '100%', textAlign: 'left', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {/* Tool icon */}
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', background: `color-mix(in srgb, ${accent} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1.25rem', color: accent, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                </div>
                {/* Label + summary */}
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{r.toolLabel}</span>
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '9999px', background: `color-mix(in srgb, ${accent} 10%, transparent)`, color: accent, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      {formatPortalDate(r.createdAt)}
                    </span>
                  </div>
                  {r.inputSummary && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: '0.2rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.inputSummary}
                    </p>
                  )}
                </div>
                {/* Expand chevron */}
                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1.125rem', color: 'var(--color-on-surface-variant)', flexShrink: 0, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                  expand_more
                </span>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div id={`ai-history-panel-${r.id}`} style={{ padding: '0 1rem 1rem', borderTop: '1px solid var(--outline-variant)' }}>
                  <div style={{ paddingTop: '0.875rem' }}>
                    <AiResultRenderer
                      toolType={r.toolType}
                      output={r.output}
                      showCopy
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
