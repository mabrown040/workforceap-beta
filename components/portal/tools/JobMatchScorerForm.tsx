'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { trackAIToolRun, trackToolLaunch } from '@/lib/analytics/events';
import ResumeAnalysisPanel from './ResumeAnalysisPanel';

export default function JobMatchScorerForm() {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        <ResumeAnalysisPanel
          resumePreview={resume}
          scorePercent={78}
          matchedSkills={['Python', 'SQL', 'Data Analysis', 'Communication']}
          missingSkills={['Kubernetes', 'AWS', 'Machine Learning']}
          analysisText={output}
          sectionAuditCards={sectionAuditCards}
          missingMetrics={missingMetrics}
          bulletSuggestions={bulletSuggestions}
        />
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
