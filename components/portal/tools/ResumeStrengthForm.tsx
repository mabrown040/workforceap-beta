'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { trackAIToolRun, trackToolLaunch } from '@/lib/analytics/events';
import ResumeAnalysisPanel from './ResumeAnalysisPanel';
import { useHydrateMemberResumePlainText } from '@/hooks/useHydrateMemberResumePlainText';

function parseOverallScore(text: string): number {
  const m = text.match(/OVERALL SCORE:\s*(\d+)\s*%/i);
  if (m) return Math.min(100, Math.max(0, parseInt(m[1], 10)));
  return 68;
}

const sectionAuditCards = [
  {
    title: 'Summary',
    status: 'Review',
    description: 'See strengths and improvements in the analysis text.',
    accent: '#1565c0',
    accentSoft: 'rgba(21, 101, 192, 0.12)',
    statusColor: '#1565c0',
  },
  {
    title: 'Experience',
    status: 'Review',
    description: 'Check bullets for metrics, scope, and strong action verbs.',
    accent: '#ed8b00',
    accentSoft: 'rgba(237, 139, 0, 0.14)',
    statusColor: '#b26a00',
  },
  {
    title: 'Skills & keywords',
    status: 'Review',
    description: 'Align skills with your target roles and ATS phrasing.',
    accent: '#2e7d32',
    accentSoft: 'rgba(46, 125, 50, 0.12)',
    statusColor: 'var(--color-green)',
  },
  {
    title: 'Education & certs',
    status: 'Review',
    description: 'Ensure dates, credentials, and program names are easy to verify.',
    accent: '#6a1b9a',
    accentSoft: 'rgba(106, 27, 154, 0.12)',
    statusColor: '#6a1b9a',
  },
];

const missingMetrics = [
  'Add quantified outcomes where possible (%, $, time saved)',
  'Clarify role scope (team size, budget, geography)',
  'Tighten formatting for ATS parsing',
];

const bulletSuggestions = [
  {
    before: 'Responsible for customer onboarding',
    after: 'Onboarded 40+ customers per quarter, cutting average setup time from 5 days to 2.',
  },
  {
    before: 'Helped improve sales',
    after: 'Supported a 12% lift in regional sales by refining outreach sequences and follow-up cadence.',
  },
];

export default function ResumeStrengthForm() {
  const [resume, setResume] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [showFloating, setShowFloating] = useState(false);

  useHydrateMemberResumePlainText(setResume);

  const canSubmit = resume.trim().length >= 100 && !loading;

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
    trackToolLaunch('resume-analysis', 'Resume Analysis');
    trackAIToolRun('started', 'resume-analysis');

    try {
      const res = await fetch('/api/ai/resume-strength', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume }),
      });

      const data = await res.json();

      if (!res.ok) {
        trackAIToolRun('errored', 'resume-analysis', { reason: data.error ?? 'request_failed' });
        setError(data.error ?? 'We couldn't complete that. Try again in a moment.');
        return;
      }

      trackAIToolRun('completed', 'resume-analysis', { output_length: (data.output ?? '').length });
      setOutput(data.output ?? '');
    } catch {
      trackAIToolRun('errored', 'resume-analysis', { reason: 'network_error' });
      setError('We couldn't connect. Check your connection and try again.');
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

  const scorePercent = output ? parseOverallScore(output) : 0;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="portal-ai-tool-form">
      <div className="form-group">
        <label htmlFor="resume-strength-body">Your resume (paste or upload PDF/DOCX)</label>
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
          id="resume-strength-body"
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder="Paste your resume here (at least 100 characters)…"
          rows={12}
          required
          minLength={100}
          disabled={loading}
        />
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <button type="submit" className="btn btn-primary" disabled={loading || !canSubmit} aria-busy={loading}>
        {loading ? (
          <>
            <Loader2 className="ai-tool-submit-spinner" size={18} aria-hidden />
            Analyzing…
          </>
        ) : (
          'Analyze resume strength'
        )}
      </button>

      {output && (
        <ResumeAnalysisPanel
          resumePreview={resume}
          scorePercent={scorePercent}
          gaugeLabel="Overall strength"
          matchedSkills={['ATS-friendly structure', 'Clear sections', 'Action-oriented language']}
          missingSkills={['See priority improvements in analysis']}
          analysisText={output}
          sectionAuditCards={sectionAuditCards}
          missingMetrics={missingMetrics}
          bulletSuggestions={bulletSuggestions}
          exportTitle="Resume Strength Analysis"
          pdfToolName="Resume Analysis"
        />
      )}
      {showFloating && (
        <div
          style={{
            position: 'fixed',
            bottom: '5rem',
            left: '1rem',
            right: '1rem',
            zIndex: 50,
          }}
        >
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}
            disabled={loading || !canSubmit}
          >
            {loading ? 'Analyzing…' : 'Analyze resume strength'}
          </button>
        </div>
      )}
    </form>
  );
}
