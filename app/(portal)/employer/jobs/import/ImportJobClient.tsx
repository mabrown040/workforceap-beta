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
      setError('Add a careers link, at least one job link, or paste enough page text for us to read (about a paragraph).');
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
        <h1 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>Review before saving</h1>
        <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          This is still private. Adjust anything that does not sound like your team, then save as a draft or send for
          WorkforceAP review.
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
        <Link href="/employer/jobs">← Back to jobs</Link>
      </div>

      <header className="import-job-header">
        <h1>Add roles from your site</h1>
        <p className="import-job-tagline">
          We turn what is already on your public careers page into private drafts. You edit, then choose when to send a
          posting for WorkforceAP review. Candidates never see anything until after that review — and your approval.
        </p>
        <ul className="import-job-confidence">
          <li>Every draft is yours to polish: pay, location, and must-haves should match how you actually hire.</li>
          <li>We cap bulk pulls so each posting stays accurate — quality over speed.</li>
          <li>If a page does not open for us, paste the text or add a single job below — same outcome.</li>
        </ul>
      </header>

      {hasSuccess && (
        <div className="import-job-success-card">
          <div className="import-job-success-icon">
            <CheckCircle2 size={32} strokeWidth={2} />
          </div>
          <div>
            <h2 className="import-job-success-title">
              {bulkResult.created.length} private draft{bulkResult.created.length !== 1 ? 's' : ''} ready
            </h2>
            <p className="import-job-success-desc">
              Nothing is visible to candidates yet. Open each one, tighten the details, then send for review when it matches
              how you hire.
            </p>
            <Link href="/employer/jobs" className="btn btn-primary import-job-success-cta">
              Go to your jobs
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
        <h2>Paste your public careers link</h2>
        <p className="import-job-hint">
          Use the same URL a candidate would use — the page that lists open roles. Internal HR logins will not work here.
        </p>
        {error && (
          <div className="import-job-error">
            {error}
          </div>
        )}
        <div className="form-group">
          <input
            type="url"
            placeholder="https://yourcompany.com/careers"
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
          {bulkLoading ? 'Building your drafts…' : 'Create private drafts from this page'}
        </button>
      </section>

      <details className="import-job-more">
        <summary>Other ways to add a role</summary>
        <div className="import-job-more-content">
          <h3>One role at a time</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', marginBottom: '0.75rem' }}>
            Paste a public job link or the full description — fastest when you are only filling one opening.
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
            {loading ? 'Reading…' : 'Build draft from this job'}
          </button>

          <h3 style={{ marginTop: '1.5rem' }}>Several direct job links</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', marginBottom: '0.75rem' }}>
            Up to fifteen public URLs, one per line — we turn each into its own draft you can edit separately.
          </p>
          <textarea rows={4} placeholder="https://...&#10;https://..." value={bulkUrls} onChange={(e) => setBulkUrls(e.target.value)} disabled={bulkLoading || loading} />
          <div className="form-group">
            <label>Or paste careers page text (about a paragraph)</label>
            <textarea rows={4} placeholder="Paste the visible text from your careers page if links do not work..." value={careersPaste} onChange={(e) => setCareersPaste(e.target.value)} disabled={bulkLoading || loading} />
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
            Create drafts from links or paste
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
