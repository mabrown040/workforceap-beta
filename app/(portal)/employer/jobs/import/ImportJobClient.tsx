'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import JobForm from '@/components/employer/JobForm';

type ImportJobClientProps = {
  companyName: string;
  programSlugs: string[];
};

export default function ImportJobClient({ companyName, programSlugs }: ImportJobClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [url, setUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkUrls, setBulkUrls] = useState('');
  const [careersUrl, setCareersUrl] = useState('');
  const [careersPaste, setCareersPaste] = useState('');
  const [bulkResult, setBulkResult] = useState<{
    created: { id: string; title: string }[];
    errors: { source: string; error: string }[];
  } | null>(null);
  const [extracted, setExtracted] = useState<{
    title: string;
    company?: string;
    location?: string;
    locationType?: string;
    jobType?: string;
    salaryMin?: number;
    salaryMax?: number;
    description: string;
    requirements?: string[];
    preferredCertifications?: string[];
    suggestedPrograms?: string[];
  } | null>(null);

  async function handleParse() {
    if (!url && !rawText.trim()) {
      setError('Enter a URL or paste the job description.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/employer/jobs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url || undefined, rawText: rawText.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to parse');
        return;
      }
      if (data.created && data.job) {
        router.push(`/employer/jobs/${data.job.id}`);
        router.refresh();
        return;
      }
      setExtracted(data.extracted);
      setStep('review');
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkImport() {
    setError(null);
    setBulkResult(null);
    const urls = bulkUrls
      .split(/[\n\r,]+/)
      .map((s) => s.trim())
      .filter((u) => /^https?:\/\//i.test(u))
      .slice(0, 15);
    const paste = careersPaste.trim();
    const cUrl = careersUrl.trim();

    if (urls.length === 0 && !cUrl && paste.length < 80) {
      setError('Add at least one job URL, a careers page URL, or paste careers page text (80+ characters).');
      return;
    }

    const body: Record<string, unknown> = {};
    if (urls.length) body.jobUrls = urls;
    if (cUrl) body.careersPageUrl = cUrl;
    if (paste.length >= 80) body.careersPageRawText = paste;

    setBulkLoading(true);
    try {
      const res = await fetch('/api/employer/jobs/import-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Bulk import failed');
        return;
      }
      setBulkResult({ created: data.created ?? [], errors: data.errors ?? [] });
      router.refresh();
    } finally {
      setBulkLoading(false);
    }
  }

  if (step === 'review' && extracted) {
    return (
      <div className="import-job-review">
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setStep('input')}
            className="btn btn-ghost"
            style={{ fontSize: '0.9rem' }}
          >
            ← Back
          </button>
        </div>
        <h1 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>Review extracted job</h1>
        <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Edit if needed, then create the draft.
        </p>
        <JobForm
          initialData={{
            title: extracted.title,
            location: extracted.location ?? '',
            locationType: extracted.locationType ?? 'onsite',
            jobType: extracted.jobType ?? 'fulltime',
            salaryMin: extracted.salaryMin,
            salaryMax: extracted.salaryMax,
            description: extracted.description,
            requirements: extracted.requirements ?? [],
            preferredCertifications: extracted.preferredCertifications ?? [],
            suggestedPrograms: extracted.suggestedPrograms ?? [],
          }}
          companyName={extracted.company ?? companyName}
          programSlugs={programSlugs}
        />
      </div>
    );
  }

  const hasSuccess = bulkResult && bulkResult.created.length > 0;

  return (
    <div className="import-job-page">
      <div className="import-job-back">
        <Link href="/employer/jobs">← My Jobs</Link>
      </div>

      <header className="import-job-header">
        <h1>Import jobs</h1>
        <p className="import-job-tagline">
          Paste your company careers page URL. We discover listings, parse each job, and create editable drafts —
          approval-ready in minutes.
        </p>
      </header>

      {hasSuccess && (
        <div className="import-job-success-card">
          <div className="import-job-success-icon">
            <CheckCircle2 size={32} strokeWidth={2} />
          </div>
          <div>
            <h2 className="import-job-success-title">
              {bulkResult.created.length} draft{bulkResult.created.length !== 1 ? 's' : ''} ready for review
            </h2>
            <p className="import-job-success-desc">
              Each is editable and can be submitted for WorkforceAP approval when ready.
            </p>
            <Link href="/employer/jobs" className="btn btn-primary import-job-success-cta">
              View drafts on My Jobs
              <ExternalLink size={16} style={{ marginLeft: '0.35rem', verticalAlign: 'middle' }} />
            </Link>
          </div>
          <ul className="import-job-success-list">
            {bulkResult.created.slice(0, 8).map((c) => (
              <li key={c.id}>
                <Link href={`/employer/jobs/${c.id}`}>{c.title}</Link>
              </li>
            ))}
            {bulkResult.created.length > 8 && (
              <li style={{ color: 'var(--color-gray-500)' }}>+{bulkResult.created.length - 8} more</li>
            )}
          </ul>
        </div>
      )}

      <section className="import-job-primary">
        <h2>Careers page URL</h2>
        <p className="import-job-hint">
          Rippling, Greenhouse, Lever, Ashby — paste the careers index URL. We use Firecrawl only for discovery; per-job
          pages use direct fetch when possible.
        </p>
        {error && (
          <div className="import-job-error">
            {error}
          </div>
        )}
        <div className="form-group">
          <input
            type="url"
            placeholder="https://ats.rippling.com/company/jobs or https://jobs.lever.co/company"
            value={careersUrl}
            onChange={(e) => setCareersUrl(e.target.value)}
            disabled={bulkLoading || loading}
            className="import-job-input"
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleBulkImport}
          disabled={bulkLoading || loading || !careersUrl.trim()}
        >
          {bulkLoading ? 'Discovering & parsing…' : 'Import from careers page'}
        </button>
      </section>

      <details className="import-job-more">
        <summary>Other import options</summary>
        <div className="import-job-more-content">
          <h3>Single job</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', marginBottom: '0.75rem' }}>
            Paste a job URL or description for one posting. Review before saving.
          </p>
          <div className="form-group">
            <label>Job URL</label>
            <input type="url" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} disabled={loading || bulkLoading} />
          </div>
          <div className="form-group">
            <label>Or paste description text</label>
            <textarea rows={6} placeholder="Paste full job description..." value={rawText} onChange={(e) => setRawText(e.target.value)} disabled={loading || bulkLoading} />
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleParse} disabled={loading || bulkLoading}>
            {loading ? 'Parsing…' : 'Parse & extract'}
          </button>

          <h3 style={{ marginTop: '1.5rem' }}>Multiple URLs</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', marginBottom: '0.75rem' }}>
            Up to 15 job URLs (one per line).
          </p>
          <textarea rows={4} placeholder="https://...&#10;https://..." value={bulkUrls} onChange={(e) => setBulkUrls(e.target.value)} disabled={bulkLoading || loading} />
          <div className="form-group">
            <label>Or paste careers page text (80+ chars)</label>
            <textarea rows={4} placeholder="Paste if the site blocks fetching..." value={careersPaste} onChange={(e) => setCareersPaste(e.target.value)} disabled={bulkLoading || loading} />
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleBulkImport}
            disabled={
              bulkLoading ||
              loading ||
              (bulkUrls.trim().split(/[\n\r,]+/).filter((u) => /^https?:\/\//i.test(u.trim())).length === 0 &&
                careersPaste.trim().length < 80 &&
                !careersUrl.trim())
            }
          >
            Import from URLs / paste
          </button>
        </div>
      </details>

      {bulkResult && bulkResult.errors.length > 0 && (
        <div className="import-job-errors">
          <strong>Some issues:</strong>
          <ul>
            {bulkResult.errors.map((err, i) => (
              <li key={i}>
                {err.source}: {err.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
