'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, Link as LinkIcon } from 'lucide-react';
import { PortalInlineSpinner } from '@/components/portal/PortalInlineSpinner';
import { trackAIToolRun, trackToolLaunch } from '@/lib/analytics/events';
import { useHydrateMemberResumePlainText } from '@/hooks/useHydrateMemberResumePlainText';
import { useDraftAutosave } from '@/hooks/useDraftAutosave';
import ResumeAnalysisPanel from './ResumeAnalysisPanel';
import ToolFollowThrough from './ToolFollowThrough';

interface ParsedMatchOutput {
  matchScore: number;
  strengths: string[];
  gaps: string[];
  quickWins: string[];
  rawText: string;
}

interface SectionAuditCard {
  title: string;
  status: string;
  description: string;
  accent: string;
  accentSoft: string;
  statusColor: string;
}

interface BulletSuggestion {
  before: string;
  after: string;
}

function deriveSectionAuditCards(parsed: ParsedMatchOutput | null, resumeText: string): SectionAuditCard[] {
  if (!parsed) return [];

  const cards: SectionAuditCard[] = [];
  const resumeLower = resumeText.toLowerCase();

  // Summary card based on overall match
  const summaryStatus = parsed.matchScore >= 80 ? 'Strong' : parsed.matchScore >= 60 ? 'Good' : 'Needs work';
  const summaryColor = parsed.matchScore >= 80 ? '#2e7d32' : parsed.matchScore >= 60 ? '#2b7bb9' : '#ed8b00';
  cards.push({
    title: 'Summary',
    status: summaryStatus,
    description: `Overall match score: ${parsed.matchScore}%. ${parsed.strengths.length} strengths identified, ${parsed.gaps.length} gaps to address.`,
    accent: summaryColor,
    accentSoft: `${summaryColor}20`,
    statusColor: summaryColor,
  });

  // Experience card based on gaps analysis
  const hasExperienceGaps = parsed.gaps.some(g => 
    /experience|years|background|worked|role|position/i.test(g)
  );
  cards.push({
    title: 'Experience',
    status: hasExperienceGaps ? 'Needs work' : 'Strong',
    description: hasExperienceGaps 
      ? 'Some experience gaps identified. Consider highlighting transferable skills.'
      : 'Your experience aligns well with the role requirements.',
    accent: hasExperienceGaps ? '#ed8b00' : '#2e7d32',
    accentSoft: hasExperienceGaps ? 'rgba(237, 139, 0, 0.14)' : 'rgba(46, 125, 50, 0.12)',
    statusColor: hasExperienceGaps ? '#b26a00' : 'var(--color-green)',
  });

  // Skills card based on strengths
  const skillsMatch = parsed.strengths.length;
  cards.push({
    title: 'Skills',
    status: skillsMatch >= 3 ? 'Strong' : skillsMatch >= 1 ? 'Good' : 'Needs work',
    description: skillsMatch > 0 
      ? `${skillsMatch} key skills match the job requirements.`
      : 'Limited direct skill matches found. Review the gaps section.',
    accent: skillsMatch >= 2 ? '#2e7d32' : '#ed8b00',
    accentSoft: skillsMatch >= 2 ? 'rgba(46, 125, 50, 0.12)' : 'rgba(237, 139, 0, 0.14)',
    statusColor: skillsMatch >= 2 ? 'var(--color-green)' : '#b26a00',
  });

  // Education card - basic heuristic
  const hasEducationSection = /education|degree|bachelor|master|phd|certification/i.test(resumeLower);
  cards.push({
    title: 'Education',
    status: hasEducationSection ? 'Present' : 'Missing detail',
    description: hasEducationSection 
      ? 'Education section found. Ensure relevant certifications are highlighted.'
      : 'Education details not clearly found. Consider adding relevant credentials.',
    accent: hasEducationSection ? '#2b7bb9' : '#d32f2f',
    accentSoft: hasEducationSection ? 'rgba(43, 123, 185, 0.12)' : 'rgba(211, 47, 47, 0.12)',
    statusColor: hasEducationSection ? '#2b7bb9' : '#d32f2f',
  });

  return cards;
}

function deriveMissingMetrics(parsed: ParsedMatchOutput | null): string[] {
  if (!parsed) return [];
  
  const metrics: string[] = [];
  
  // Extract metrics-related gaps
  const metricsGaps = parsed.gaps.filter(g => 
    /quantif|metric|number|%|percent|measure|track|improve|reduce|increase/i.test(g)
  );
  
  if (metricsGaps.length > 0) {
    metrics.push(...metricsGaps.slice(0, 2));
  }
  
  // Add generic metrics advice if none found
  if (metrics.length === 0) {
    metrics.push('Consider adding quantified achievements (%, numbers, timeframes)');
  }
  
  // Check for scope/leadership mentions
  const hasScopeMention = parsed.strengths.some(s => /team|lead|manage|direct|scope/i.test(s));
  if (!hasScopeMention) {
    metrics.push('Highlight team size, scope, or leadership responsibilities');
  }
  
  return metrics.slice(0, 3);
}

const BULLET_STOPWORDS = new Set([
  'with', 'that', 'this', 'from', 'your', 'have', 'will', 'into', 'more',
  'them', 'they', 'their', 'about', 'which', 'using', 'used', 'role', 'roles',
  'resume', 'consider', 'adding', 'include', 'highlight', 'emphasize', 'quantify',
  'should', 'could', 'would', 'where', 'when', 'what', 'than', 'then', 'such',
]);

function bulletKeywords(text: string): string[] {
  return Array.from(
    new Set(
      (text.toLowerCase().match(/[a-z][a-z0-9+#.]{3,}/g) ?? []).filter(
        (w) => !BULLET_STOPWORDS.has(w)
      )
    )
  );
}

// Pull candidate resume bullet/lines from the member's actual pasted resume so
// the "Before" we show is the user's real content — never invented text.
function resumeBulletLines(resumeText: string): string[] {
  return resumeText
    .split('\n')
    .map((line) => line.replace(/^\s*[•\-*–·●○▪►]+\s*/, '').trim())
    .filter((line) => {
      const words = line.split(/\s+/).filter(Boolean);
      return words.length >= 4 && line.length <= 320;
    });
}

function deriveBulletSuggestions(
  parsed: ParsedMatchOutput | null,
  resumeText: string
): BulletSuggestion[] {
  if (!parsed || parsed.quickWins.length === 0) return [];

  const lines = resumeBulletLines(resumeText);
  if (lines.length === 0) return [];

  const usedLineIndexes = new Set<number>();
  const suggestions: BulletSuggestion[] = [];

  for (const win of parsed.quickWins) {
    if (suggestions.length >= 2) break;

    const winKeywords = bulletKeywords(win);
    if (winKeywords.length === 0) continue;

    // Find the member's own resume line that best overlaps the quick-win's
    // keywords. Only pair a suggestion when we can anchor it to real content.
    let bestIdx = -1;
    let bestScore = 0;
    lines.forEach((line, idx) => {
      if (usedLineIndexes.has(idx)) return;
      const lineLower = line.toLowerCase();
      const score = winKeywords.reduce(
        (acc, kw) => (lineLower.includes(kw) ? acc + 1 : acc),
        0
      );
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });

    if (bestIdx === -1 || bestScore === 0) continue;

    usedLineIndexes.add(bestIdx);
    suggestions.push({
      before: lines[bestIdx],
      after: win,
    });
  }

  return suggestions;
}

function extractSkillsFromAnalysis(parsed: ParsedMatchOutput | null, resumeText: string, jobDesc: string): { matched: string[]; missing: string[] } {
  if (!parsed) return { matched: [], missing: [] };
  
  // Use strengths as matched skills (extract key terms)
  const matched = parsed.strengths
    .map(s => {
      // Extract capitalized terms or technical terms
      const terms = s.match(/\b([A-Z][a-zA-Z]{2,}|Python|SQL|JavaScript|React|AWS|Azure|GCP|Kubernetes|Docker|AI|ML|Data)\b/g);
      return terms ? terms[0] : null;
    })
    .filter((s): s is string => Boolean(s))
    .slice(0, 4);
  
  // Use gaps as missing skills
  const missing = parsed.gaps
    .map(g => {
      const terms = g.match(/\b([A-Z][a-zA-Z]{2,}|Python|SQL|JavaScript|React|AWS|Azure|GCP|Kubernetes|Docker|AI|ML|Data)\b/g);
      return terms ? terms[0] : null;
    })
    .filter((s): s is string => Boolean(s))
    .slice(0, 3);
  
  // Fallback: if no skills extracted, return empty arrays
  return { 
    matched: matched.length > 0 ? matched : ['Experience', 'Skills'], 
    missing: missing.length > 0 ? missing : ['See gaps above'] 
  };
}

export default function JobMatchScorerForm() {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [output, setOutput] = useState('');
  const [parsedOutput, setParsedOutput] = useState<ParsedMatchOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [scrapingUrl, setScrapingUrl] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [showFloating, setShowFloating] = useState(false);

  useHydrateMemberResumePlainText(setResume);
  // Resume hydrates server-side. Persist the user-typed inputs so a refresh
  // mid-paste of a long job description doesn't lose the work.
  useDraftAutosave('ai-tool:job-match-scorer:jobDescription', jobDescription, setJobDescription);
  useDraftAutosave('ai-tool:job-match-scorer:jobUrl', jobUrl, setJobUrl);

  const canSubmit = resume.trim().length > 0 && (jobDescription.trim().length > 0 || jobUrl.trim().length > 0) && !loading && !scrapingUrl;

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
    setParsedOutput(null);
    setLoading(true);
    trackToolLaunch('job-match-scorer', 'Job Match Scorer');
    trackAIToolRun('started', 'job-match-scorer');

    try {
      const payload = {
        resume,
        ...(jobDescription.trim() ? { jobDescription: jobDescription.trim() } : {}),
        ...(jobUrl.trim() ? { jobUrl: jobUrl.trim() } : {}),
      };

      const res = await fetch('/api/ai/job-match-scorer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        trackAIToolRun('errored', 'job-match-scorer', { reason: data.error ?? 'request_failed' });
        setError(data.error ?? 'Something went wrong');
        return;
      }

      trackAIToolRun('completed', 'job-match-scorer', { output_length: (data.output ?? '').length });
      setOutput(data.output ?? '');
      setParsedOutput(data.parsed ?? null);
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

  // Derive display data from parsed output
  const sectionAuditCards = deriveSectionAuditCards(parsedOutput, resume);
  const missingMetrics = deriveMissingMetrics(parsedOutput);
  const bulletSuggestions = deriveBulletSuggestions(parsedOutput, resume);
  const { matched: matchedSkills, missing: missingSkills } = extractSkillsFromAnalysis(parsedOutput, resume, jobDescription);
  const scorePercent = parsedOutput?.matchScore ?? 0;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="portal-ai-tool-form">
      <div className="form-group">
        <label htmlFor="job-url">
          Job posting URL (optional)
          <span style={{ fontWeight: 400, color: 'var(--color-on-surface-variant)', marginLeft: '0.5rem' }}>
            — we&rsquo;ll scrape the job description
          </span>
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            id="job-url"
            type="url"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://company.com/careers/job-posting"
            disabled={loading || scrapingUrl}
            style={{ flex: 1 }}
          />
          {scrapingUrl && <PortalInlineSpinner size={18} />}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0' }}>
          <LinkIcon size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
          Best results come from direct Greenhouse, Lever, and Ashby job links. Other career pages may vary.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="job-desc">
          Job description {jobUrl.trim() ? '(optional if the URL works, recommended as backup)' : '(required if no URL)'}
        </label>
        <textarea
          id="job-desc"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job posting here..."
          rows={6}
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

      <button type="submit" className="btn btn-primary" disabled={!canSubmit} aria-busy={loading}>
        {loading ? (
          <>
            <PortalInlineSpinner size={18} />
            Analyzing match…
          </>
        ) : (
          'Get match score'
        )}
      </button>

      {output && parsedOutput && (
        <>
          <ResumeAnalysisPanel
            resumePreview={resume}
            scorePercent={scorePercent}
            matchedSkills={matchedSkills}
            missingSkills={missingSkills}
            analysisText={output}
            sectionAuditCards={sectionAuditCards}
            missingMetrics={missingMetrics}
            bulletSuggestions={bulletSuggestions}
          />
          <ToolFollowThrough toolType="job_match_scorer" />
        </>
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
          className="md:wa-hidden"
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
                <PortalInlineSpinner size={18} />
                Analyzing…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }} aria-hidden="true">analytics</span>
                Analyze Match
              </>
            )}
          </button>
        </div>
      )}
    </form>
  );
}
