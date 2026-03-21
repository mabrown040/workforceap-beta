'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
      <div>
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
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Review extracted job</h1>
        <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
          AI extracted the details below. Edit if needed, then create the draft.
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

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/employer/jobs" style={{ color: 'var(--color-gray-600)', fontSize: '0.9rem' }}>
          ← Back to My Jobs
        </Link>
      </div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Import jobs</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
        Use <strong>Single job</strong> for one LinkedIn or careers posting (review before saving). Use{' '}
        <strong>Bulk</strong> for many URLs at once or a company careers page — each becomes an editable draft on My
        Jobs.
      </p>

      <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Single job</h2>
      <p style={{ color: 'var(--color-gray-600)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Paste a job URL or the full description text. Some sites block automatic fetching; if the URL fails, paste the
        text instead.
      </p>

      {error && (
        <div
          style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            background: '#fee',
            borderRadius: 'var(--radius-sm)',
            color: '#c00',
          }}
        >
          {error}
        </div>
      )}

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label>Job URL (optional)</label>
        <input
          type="url"
          placeholder="https://www.linkedin.com/jobs/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading || bulkLoading}
        />
      </div>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label>Or paste job description text *</label>
        <textarea
          rows={10}
          placeholder="Paste the full job description here if URL doesn't work..."
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          disabled={loading || bulkLoading}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleParse}
          disabled={loading || bulkLoading}
        >
          {loading ? 'Parsing…' : 'Parse & Extract'}
        </button>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '2rem 0' }} />

      <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Bulk import (drafts)</h2>
      <p style={{ color: 'var(--color-gray-600)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Up to 15 job posting URLs (one per line), and/or a careers page URL, and/or pasted text from a careers page.
        AI splits listings when possible. Every import is saved as a <strong>draft</strong> — review on My Jobs, then
        submit for review.
      </p>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label>Job URLs (one per line, max 15)</label>
        <textarea
          rows={5}
          placeholder="https://...&#10;https://..."
          value={bulkUrls}
          onChange={(e) => setBulkUrls(e.target.value)}
          disabled={bulkLoading || loading}
        />
      </div>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label>Company careers page URL (optional)</label>
        <input
          type="url"
          placeholder="https://careers.example.com"
          value={careersUrl}
          onChange={(e) => setCareersUrl(e.target.value)}
          disabled={bulkLoading || loading}
        />
      </div>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label>Or paste careers / job index page text (optional, 80+ characters)</label>
        <textarea
          rows={6}
          placeholder="If the site blocks fetching, paste visible job titles and descriptions here..."
          value={careersPaste}
          onChange={(e) => setCareersPaste(e.target.value)}
          disabled={bulkLoading || loading}
        />
      </div>

      <button
        type="button"
        className="btn btn-secondary"
        onClick={handleBulkImport}
        disabled={bulkLoading || loading}
      >
        {bulkLoading ? 'Importing…' : 'Create draft jobs'}
      </button>

      {bulkResult && (bulkResult.created.length > 0 || bulkResult.errors.length > 0) && (
        <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          {bulkResult.created.length > 0 && (
            <div style={{ color: 'var(--color-gray-800)' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                Created {bulkResult.created.length} draft(s). Edit or submit from{' '}
                <Link href="/employer/jobs" style={{ color: 'var(--color-accent)' }}>
                  My Jobs
                </Link>
                :
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {bulkResult.created.map((c) => (
                  <li key={c.id}>
                    <Link href={`/employer/jobs/${c.id}`} style={{ color: 'var(--color-accent)' }}>
                      {c.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {bulkResult.errors.length > 0 && (
            <ul style={{ color: '#a00', marginTop: '0.5rem' }}>
              {bulkResult.errors.map((err, i) => (
                <li key={i}>
                  {err.source}: {err.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
