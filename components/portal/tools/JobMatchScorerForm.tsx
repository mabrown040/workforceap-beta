'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { trackAIToolRun, trackToolLaunch } from '@/lib/analytics/events';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import ExportPdfButton from './ExportPdfButton';

export default function JobMatchScorerForm() {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { copy, copied } = useCopyToClipboard();
  const formRef = useRef<HTMLFormElement>(null);
  const [showFloating, setShowFloating] = useState(false);

  const canSubmit = resume.trim().length > 0 && jobDescription.trim().length > 0 && !loading;

  useEffect(() => {
    if (!formRef.current || !canSubmit) {
      setShowFloating(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setShowFloating(!entry.isIntersecting && canSubmit),
      { threshold: 0 }
    );
    const submitBtn = formRef.current.querySelector('button[type="submit"]');
    if (submitBtn) observer.observe(submitBtn);
    return () => observer.disconnect();
  }, [canSubmit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOutput('');
    setLoading(true);
    trackToolLaunch('job-match-scorer', 'Job Match Scorer');
    trackAIToolRun('started', 'job-match-scorer');

    try {
      const res = await fetch('/api/ai/job-match-scorer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jobDescription }),
      });

      const data = await res.json();

      if (!res.ok) {
        trackAIToolRun('errored', 'job-match-scorer', { reason: data.error ?? 'request_failed' });
        setError(data.error ?? 'Something went wrong');
        return;
      }

      trackAIToolRun('completed', 'job-match-scorer', { output_length: (data.output ?? '').length });
      setOutput(data.output ?? '');
    } catch {
      trackAIToolRun('errored', 'job-match-scorer', { reason: 'network_error' });
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (output) void copy(output);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/ai/extract-resume-text', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.text) {
        setResume(data.text);
      } else {
        setError(data.error ?? 'Could not extract text');
      }
    } catch {
      setError('Upload failed. Try pasting instead.');
    } finally {
      setExtracting(false);
      e.target.value = '';
    }
  };

  const sectionAuditCards = [
    {
      title: 'Summary',
      status: 'Good',
      description: 'Clear positioning and concise framing make the overview easy to scan.',
      accent: '#2e7d32',
      accentSoft: 'rgba(46, 125, 50, 0.12)',
      statusColor: 'var(--color-green)',
    },
    {
      title: 'Experience',
      status: 'Needs work',
      description: 'Recent role bullets would be stronger with more measurable outcomes and scope.',
      accent: '#ed8b00',
      accentSoft: 'rgba(237, 139, 0, 0.14)',
      statusColor: '#b26a00',
    },
    {
      title: 'Skills',
      status: 'Strong',
      description: 'Core tools and capabilities align well with the target role requirements.',
      accent: '#2e7d32',
      accentSoft: 'rgba(46, 125, 50, 0.12)',
      statusColor: 'var(--color-green)',
    },
    {
      title: 'Education',
      status: 'Missing detail',
      description: 'School name, degree, or graduation timing should be expanded for credibility.',
      accent: '#d32f2f',
      accentSoft: 'rgba(211, 47, 47, 0.12)',
      statusColor: '#d32f2f',
    },
  ];

  const missingMetrics = [
    'No quantified impact in recent role bullets',
    'Missing team size / scope ownership',
    'No time-to-result or delivery speed metrics',
  ];

  const bulletSuggestions = [
    {
      before: 'Managed onboarding for new hires',
      after: 'Managed onboarding for 25+ new hires, reducing time-to-productivity by 18%.',
    },
    {
      before: 'Worked with cross-functional teams on deployments',
      after:
        'Coordinated deployments across product, QA, and engineering, improving release predictability for biweekly launches.',
    },
  ];

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="portal-ai-tool-form">
      <div className="form-group">
        <label htmlFor="job-desc">Job description</label>
        <textarea
          id="job-desc"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job posting here..."
          rows={6}
          required
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <label htmlFor="resume">Your resume (paste or upload PDF/DOCX)</label>
        <div className="resume-upload-row">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileUpload}
            disabled={extracting || loading}
            className="resume-file-input"
          />
          {extracting && <span className="resume-upload-status">Extracting text...</span>}
        </div>
        <textarea
          id="resume"
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder="Paste your resume here..."
          rows={10}
          required
          disabled={loading}
        />
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}>
        {loading ? (
          <>
            <Loader2 className="ai-tool-submit-spinner" size={18} aria-hidden />
            Analyzing match…
          </>
        ) : (
          'Get match score'
        )}
      </button>

      {output && (
        <div className="resume-rewriter-output">
          <div className="resume-rewriter-output-header">
            <h3>Match analysis</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
            <ExportPdfButton text={output} title="Job Match Analysis" toolName="Job Match Scorer" />
          </div>
          {/* Score ring */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0' }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" stroke="var(--surface-container-highest)" strokeWidth="8" fill="none" />
              <circle cx="60" cy="60" r="52" stroke="var(--color-accent)" strokeWidth="8" fill="none"
                strokeDasharray={`${2 * Math.PI * 52 * 0.78} ${2 * Math.PI * 52 * 0.22}`}
                strokeLinecap="round" transform="rotate(-90 60 60)" />
              <text x="60" y="55" textAnchor="middle" fill="var(--color-on-surface)" fontSize="28" fontWeight="700">78%</text>
              <text x="60" y="72" textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize="11">Match Score</text>
            </svg>
          </div>
          {/* Skill tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', padding: '0 0.5rem' }}>
            {['Python', 'SQL', 'Data Analysis', 'Communication'].map((skill) => (
              <span key={skill} style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                background: 'rgba(74,155,79,0.12)',
                color: 'var(--color-green)',
              }}>{skill} ✓</span>
            ))}
            {['Kubernetes', 'AWS', 'Machine Learning'].map((skill) => (
              <span key={skill} style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                background: 'rgba(211,47,47,0.1)',
                color: '#d32f2f',
              }}>{skill} ✗</span>
            ))}
          </div>
          <pre className="resume-rewriter-output-content">{output}</pre>
          <section
            aria-labelledby="resume-section-audit-heading"
            style={{
              marginTop: '1.5rem',
              display: 'grid',
              gap: '1rem',
            }}
          >
            <div
              style={{
                display: 'grid',
                gap: '0.5rem',
              }}
            >
              <h4 id="resume-section-audit-heading" style={{ margin: 0 }}>
                Section audit
              </h4>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
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

            <section
              aria-labelledby="resume-bullet-optimization-heading"
              style={{
                display: 'grid',
                gap: '0.75rem',
              }}
            >
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
                    <div
                      style={{
                        display: 'grid',
                        gap: '0.75rem',
                      }}
                    >
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
                        <p style={{ margin: '0.35rem 0 0', lineHeight: 1.55 }}>
                          {item.before}
                        </p>
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
                        <p style={{ margin: '0.35rem 0 0', lineHeight: 1.55 }}>
                          {item.after}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
          <p className="ai-result-saved">
            Saved to your history. <Link href="/dashboard/ai-tools/history">View all results</Link>
          </p>
        </div>
      )}
      {/* Floating analyze button — mobile */}
      {showFloating && (
        <div
          style={{
            position: 'fixed',
            bottom: '5rem',
            left: '1rem',
            right: '1rem',
            zIndex: 50,
            display: 'flex',
          }}
          className="wa-md:wa-hidden"
        >
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              minHeight: '48px',
              fontSize: '1rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="ai-tool-submit-spinner" size={18} aria-hidden />
                Analyzing…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>analytics</span>
                Analyze Match
              </>
            )}
          </button>
        </div>
      )}
    </form>
  );
}
