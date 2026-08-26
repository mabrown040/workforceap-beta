'use client';

import { useState, useRef, useEffect } from 'react';
import { } from 'lucide-react';
import { PortalInlineSpinner } from '@/components/portal/PortalInlineSpinner';
import { trackAIToolRun, trackToolLaunch } from '@/lib/analytics/events';
import { getResumeExtractionWarning } from '@/lib/resume/extractionQuality';
import ResumeAnalysisPanel, { type ResumeSectionAuditCard } from './ResumeAnalysisPanel';
import ResumeScoreBreakdown, { type ResumeScorePayload } from './ResumeScoreBreakdown';
import ToolFollowThrough from './ToolFollowThrough';
import AiToolError from './AiToolError';
import { useHydrateMemberResumePlainText } from '@/hooks/useHydrateMemberResumePlainText';

// Static visual styling per audit card. The *status* (Pass/Review) is derived
// from the real per-resume structural subscores below — never hardcoded.
const SECTION_AUDIT_STYLE = {
  structure: {
    title: 'Sections & structure',
    description: 'See strengths and improvements in the analysis text.',
    accent: '#1565c0',
    accentSoft: 'rgba(21, 101, 192, 0.12)'},
  quantification: {
    title: 'Quantified achievements',
    description: 'Check bullets for metrics, scope, and strong action verbs.',
    accent: '#ed8b00',
    accentSoft: 'rgba(237, 139, 0, 0.14)'},
  actionVerbs: {
    title: 'Action-verb openers',
    description: 'Lead bullets with strong action verbs aligned to your target roles.',
    accent: '#2e7d32',
    accentSoft: 'rgba(46, 125, 50, 0.12)'},
  contact: {
    title: 'Contact essentials',
    description: 'Ensure email, phone, and location are present and ATS-parsable.',
    accent: '#6a1b9a',
    accentSoft: 'rgba(106, 27, 154, 0.12)'}} as const;

// Order in which audit cards appear when the corresponding subscore exists.
const SECTION_AUDIT_ORDER = ['structure', 'quantification', 'actionVerbs', 'contact'] as const;

const PASS_STYLE = { status: 'Pass', statusColor: 'var(--color-green)', accent: '#2e7d32', accentSoft: 'rgba(46, 125, 50, 0.12)' };

/**
 * Build per-section audit cards from the real deterministic structural subscores
 * returned by the resume-strength API. Each card's status (Pass/Review) reflects
 * that resume's actual subscore rather than a constant.
 */
function deriveSectionAuditCards(payload: ResumeScorePayload | null): ResumeSectionAuditCard[] {
  const breakdown = payload?.structural?.breakdown;
  if (!breakdown) return [];
  return SECTION_AUDIT_ORDER.flatMap((key) => {
    const sub = breakdown[key as keyof typeof breakdown];
    if (!sub) return [];
    const style = SECTION_AUDIT_STYLE[key];
    const isPass = sub.score >= 70;
    return [{
      title: style.title,
      status: isPass ? 'Pass' : 'Review',
      description: style.description,
      accent: isPass ? PASS_STYLE.accent : style.accent,
      accentSoft: isPass ? PASS_STYLE.accentSoft : style.accentSoft,
      statusColor: isPass ? PASS_STYLE.statusColor : '#b26a00'}];
  });
}

/**
 * Surface the real per-resume findings the deterministic scorer produced for the
 * weakest structural dimensions (quantification, structure, contact). These are the
 * actual `notes` computed from this resume, not generic tips.
 */
function deriveMissingMetrics(payload: ResumeScorePayload | null): string[] {
  const breakdown = payload?.structural?.breakdown;
  if (!breakdown) return [];
  const findings: string[] = [];
  for (const key of ['quantification', 'structure', 'contact', 'bulletLength'] as const) {
    const sub = breakdown[key];
    if (sub && sub.score < 80) {
      for (const note of sub.notes) {
        const trimmed = note.trim();
        // Skip purely informational tallies; keep actionable gaps.
        if (trimmed && !findings.includes(trimmed)) findings.push(trimmed);
      }
    }
  }
  return findings;
}

/** Collect the real "must-have" keywords this resume already covers / is missing across target occupations. */
function deriveKeyword(
  payload: ResumeScorePayload | null,
  field: 'mustHavePresent' | 'mustHaveMissing',
): string[] {
  const market = payload?.marketCoverage;
  if (!market) return [];
  const seen = new Set<string>();
  for (const m of market) {
    if (m.source === 'unavailable') continue;
    for (const kw of m[field]) {
      if (!seen.has(kw.phrase)) seen.add(kw.phrase);
    }
  }
  return Array.from(seen).slice(0, 8);
}

export default function ResumeStrengthForm() {
  const [resume, setResume] = useState('');
  const [output, setOutput] = useState('');
  const [scorePayload, setScorePayload] = useState<ResumeScorePayload | null>(null);
  const [extractionWarning, setExtractionWarning] = useState<string | null>(null);
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
    setScorePayload(null);
    setExtractionWarning(getResumeExtractionWarning(resume));
    setLoading(true);
    trackToolLaunch('resume-analysis', 'Resume Analysis');
    trackAIToolRun('started', 'resume-analysis');

    try {
      const res = await fetch('/api/ai/resume-strength', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume })});

      const data = await res.json();

      if (!res.ok) {
        trackAIToolRun('errored', 'resume-analysis', { reason: data.error ?? 'request_failed' });
        setError(data.error ?? 'Something went wrong');
        return;
      }

      trackAIToolRun('completed', 'resume-analysis', { output_length: (data.output ?? '').length });
      setOutput(data.output ?? '');
      setScorePayload({
        composite: data.composite,
        pillars: data.pillars,
        structural: data.structural,
        occupations: data.occupations,
        onetCoverage: data.onetCoverage,
        marketCoverage: data.marketCoverage});
    } catch {
      trackAIToolRun('errored', 'resume-analysis', { reason: 'network_error' });
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
        body: formData});
      const data = await res.json();
      if (res.ok && data.text) {
        setResume(data.text);
        setExtractionWarning(getResumeExtractionWarning(data.text));
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

  const scorePercent = scorePayload?.composite ?? 0;
  const sectionAuditCards = deriveSectionAuditCards(scorePayload);
  const missingMetrics = deriveMissingMetrics(scorePayload);
  const matchedSkills = deriveKeyword(scorePayload, 'mustHavePresent');
  const missingSkills = deriveKeyword(scorePayload, 'mustHaveMissing');

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
      {error ? <AiToolError error={error} /> : null}
      <button type="submit" className="btn btn-primary" disabled={loading || !canSubmit} aria-busy={loading}>
        {loading ? (
          <>
            <PortalInlineSpinner size={18} />
            Analyzing…
          </>
        ) : (
          'Analyze resume strength'
        )}
      </button>

      {output && (
        <>
          {scorePayload && <ResumeScoreBreakdown payload={scorePayload} />}
          <ResumeAnalysisPanel
            resumePreview={resume}
            scorePercent={scorePercent}
            gaugeLabel="Overall strength"
            extractionWarning={extractionWarning}
            matchedSkills={matchedSkills}
            missingSkills={missingSkills}
            analysisText={output}
            sectionAuditCards={sectionAuditCards}
            missingMetrics={missingMetrics}
            bulletSuggestions={[]}
            exportTitle="Resume Strength Analysis"
            pdfToolName="Resume Analysis"
          />
          <ToolFollowThrough toolType="resume_rewriter" />
        </>
      )}
      {showFloating && (
        <div
          style={{
            position: 'fixed',
            bottom: '5rem',
            left: '1rem',
            right: '1rem',
            zIndex: 50}}
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
