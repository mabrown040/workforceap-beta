'use client';

import Link from 'next/link';
import ExportPdfButton from './ExportPdfButton';
import ToolFollowThrough from './ToolFollowThrough';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

export type ResumeSectionAuditCard = {
  title: string;
  status: string;
  description: string;
  accent: string;
  accentSoft: string;
  statusColor: string;
};

export type BulletSuggestionPair = { before: string; after: string };

type Props = {
  resumePreview: string;
  /** 0–100 match score for the circular gauge */
  scorePercent: number;
  /** Label under the score (e.g. job match vs. overall resume strength). */
  gaugeLabel?: string;
  extractionWarning?: string | null;
  matchedSkills: string[];
  missingSkills: string[];
  analysisText: string;
  sectionAuditCards: ResumeSectionAuditCard[];
  missingMetrics: string[];
  bulletSuggestions: BulletSuggestionPair[];
  exportTitle?: string;
  pdfToolName?: string;
};

/**
 * Split-pane layout: resume document preview + target alignment score, skill tags, and audit sections.
 */
export default function ResumeAnalysisPanel({
  resumePreview,
  scorePercent,
  gaugeLabel = 'Target alignment',
  extractionWarning,
  matchedSkills,
  missingSkills,
  analysisText,
  sectionAuditCards,
  missingMetrics,
  bulletSuggestions,
  exportTitle = 'Job Match Analysis',
  pdfToolName = 'Job Match Scorer',
}: Props) {
  const { copy, copied } = useCopyToClipboard();
  const clamped = Math.min(100, Math.max(0, scorePercent));
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = c * (clamped / 100);

  return (
    <div className="resume-analysis-split">
      <div className="resume-analysis-preview-pane">
        <div className="resume-analysis-preview-label">Your resume</div>
        <div className="resume-analysis-preview-doc">
          <pre className="resume-analysis-preview-pre">{resumePreview || '—'}</pre>
        </div>
      </div>

      <div className="resume-analysis-results-pane resume-rewriter-output">
        <div className="resume-rewriter-output-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ flex: '1 1 100%', margin: 0 }}>Match analysis</h3>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void copy(analysisText)}>
              <span aria-live="polite" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }} aria-hidden="true">
                  {copied ? "check" : "content_copy"}
                </span>
                {copied ? "Copied!" : "Copy to clipboard"}
              </span>

          </button>
          <ExportPdfButton text={analysisText} title={exportTitle} toolName={pdfToolName} />
        </div>

        {extractionWarning && (
          <div
            role="alert"
            style={{
              marginTop: '1rem',
              padding: '0.875rem 1rem',
              borderRadius: '0.75rem',
              border: '1px solid rgba(237, 139, 0, 0.28)',
              background: 'linear-gradient(180deg, rgba(237, 139, 0, 0.12), rgba(237, 139, 0, 0.06))',
              color: 'var(--color-on-surface)',
              fontSize: '0.875rem',
              lineHeight: 1.45,
            }}
          >
            {extractionWarning}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0' }}>
          <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden>
            <circle cx="60" cy="60" r={r} stroke="var(--surface-container-highest)" strokeWidth="8" fill="none" />
            <circle
              cx="60"
              cy="60"
              r={r}
              stroke="var(--color-accent)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${dash} ${c}`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
            <text x="60" y="55" textAnchor="middle" fill="var(--color-on-surface)" fontSize="28" fontWeight="700">
              {clamped}%
            </text>
            <text x="60" y="72" textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize="11">
              {gaugeLabel}
            </text>
          </svg>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', padding: '0 0.5rem' }}>
          {matchedSkills.map((skill) => (
            <span
              key={`m-${skill}`}
              style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                background: 'rgba(74,155,79,0.12)',
                color: 'var(--color-green)',
              }}
            >
              {skill} ✓
            </span>
          ))}
          {missingSkills.map((skill) => (
            <span
              key={`x-${skill}`}
              style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                background: 'rgba(211,47,47,0.1)',
                color: '#d32f2f',
              }}
            >
              {skill} ✗
            </span>
          ))}
        </div>

        <pre className="resume-rewriter-output-content">{analysisText}</pre>

        <section aria-labelledby="resume-section-audit-heading" style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <h4 id="resume-section-audit-heading" style={{ margin: 0 }}>
              Section audit
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {sectionAuditCards.map((card) => (
                <article
                  key={card.title}
                  style={{
                    flex: '1 1 220px',
                    minWidth: '220px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(127, 127, 127, 0.2)',
                    borderLeft: `4px solid ${card.accent}`,
                    background: 'var(--surface-container-highest)',
                    padding: '1rem',
                    boxShadow: '0 1px 0 rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <h5 style={{ margin: 0, fontSize: '1rem' }}>{card.title}</h5>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: card.accentSoft,
                        color: card.statusColor,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: '0.5rem',
                          height: '0.5rem',
                          borderRadius: '999px',
                          background: card.accent,
                          display: 'inline-block',
                        }}
                      />
                      {card.status}
                    </span>
                  </div>
                  <p style={{ margin: '0.65rem 0 0', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
                    {card.description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <section
            aria-labelledby="resume-missing-metrics-heading"
            style={{
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(237, 139, 0, 0.25)',
              background: 'linear-gradient(180deg, rgba(237, 139, 0, 0.12), rgba(237, 139, 0, 0.06))',
              padding: '1rem',
            }}
          >
            <h4 id="resume-missing-metrics-heading" style={{ margin: 0 }}>
              Missing metrics
            </h4>
            <ul
              style={{
                margin: '0.75rem 0 0',
                paddingLeft: '1.25rem',
                display: 'grid',
                gap: '0.5rem',
                color: 'var(--color-on-surface)',
              }}
            >
              {missingMetrics.map((metric) => (
                <li key={metric}>{metric}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="resume-bullet-optimization-heading" style={{ display: 'grid', gap: '0.75rem' }}>
            <h4 id="resume-bullet-optimization-heading" style={{ margin: 0 }}>
              Bullet optimization suggestions
            </h4>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {bulletSuggestions.map((item) => (
                <article
                  key={item.before}
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(127, 127, 127, 0.18)',
                    background: 'var(--surface-container-highest)',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <div
                      style={{
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(127, 127, 127, 0.14)',
                        background: 'rgba(127, 127, 127, 0.06)',
                        padding: '0.85rem',
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>
                        Before
                      </div>
                      <p style={{ margin: '0.35rem 0 0', lineHeight: 1.55 }}>{item.before}</p>
                    </div>
                    <div
                      style={{
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(46, 125, 50, 0.22)',
                        background: 'rgba(46, 125, 50, 0.08)',
                        padding: '0.85rem',
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-green)' }}>
                        After
                      </div>
                      <p style={{ margin: '0.35rem 0 0', lineHeight: 1.55 }}>{item.after}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        <ToolFollowThrough toolType="resume_analysis" />

        <p className="ai-result-saved">
          Saved to your history. <Link href="/dashboard/ai-tools/history">View all results</Link>
        </p>
      </div>
    </div>
  );
}
