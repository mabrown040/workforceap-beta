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
  const [error, setError] = useState<string | null>(null);
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
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Import job from URL</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
        Paste a LinkedIn job URL or any job posting URL. Or paste the job description text directly. AI will extract
        the details.
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
          disabled={loading}
        />
      </div>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label>Or paste job description text *</label>
        <textarea
          rows={10}
          placeholder="Paste the full job description here if URL doesn't work..."
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          disabled={loading}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleParse}
          disabled={loading}
        >
          {loading ? 'Parsing…' : 'Parse & Extract'}
        </button>
      </div>
    </div>
  );
}
