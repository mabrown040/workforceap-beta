'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function EmployerJobPostForm() {
  const [phase, setPhase] = useState<'form' | 'success'>('form');
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const requirements = String(formData.get('requirements') || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const salaryMinRaw = String(formData.get('salaryMin') || '').trim();
    const salaryMaxRaw = String(formData.get('salaryMax') || '').trim();
    const salaryMinParsed = salaryMinRaw ? parseInt(salaryMinRaw, 10) : null;
    const salaryMaxParsed = salaryMaxRaw ? parseInt(salaryMaxRaw, 10) : null;
    const salaryMin = salaryMinParsed !== null && !Number.isNaN(salaryMinParsed) ? salaryMinParsed : null;
    const salaryMax = salaryMaxParsed !== null && !Number.isNaN(salaryMaxParsed) ? salaryMaxParsed : null;

    const payload = {
      title: String(formData.get('title') || '').trim(),
      description: String(formData.get('description') || '').trim(),
      location: String(formData.get('location') || '').trim() || undefined,
      locationType: 'onsite',
      jobType: (formData.get('jobType') as string) || 'fulltime',
      salaryMin,
      salaryMax,
      requirements,
      status: 'live' as const,
    };

    if (!payload.title) {
      setErrorMsg('Add a job title.');
      setStatus('error');
      return;
    }
    if (!payload.description) {
      setErrorMsg('Add a job description.');
      setStatus('error');
      return;
    }
    if (
      salaryMin != null &&
      salaryMax != null &&
      salaryMax < salaryMin
    ) {
      setErrorMsg('Maximum salary must be greater than or equal to minimum salary.');
      setStatus('error');
      return;
    }

    setStatus('saving');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/employer/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(typeof data.error === 'string' ? data.error : 'Could not post job.');
        return;
      }
      setPhase('success');
      form.reset();
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Check your connection and try again.');
    } finally {
      setStatus('idle');
    }
  }

  if (phase === 'success') {
    return (
      <div className="portal-card portal-card--flat" style={{ padding: '2rem', textAlign: 'center' }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '3rem', color: 'var(--color-accent)', display: 'block', marginBottom: '1rem' }}
          aria-hidden
        >
          check_circle
        </span>
        <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>
          Your job is now live
        </h2>
        <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Candidates can discover your posting. Manage it anytime from Job Postings.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
          <Link
            href="/employer/jobs"
            style={{
              padding: '0.625rem 1.25rem',
              background: 'var(--color-accent)',
              color: '#fff',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            View my jobs
          </Link>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setPhase('form')}
            style={{ fontSize: '0.875rem' }}
          >
            Post another job
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="employer-job-form" onSubmit={handleSubmit} noValidate>
      {status === 'error' && errorMsg && (
        <div className="employer-job-form-error" role="alert">
          {errorMsg}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="post-job-title">Job title *</label>
        <input
          id="post-job-title"
          name="title"
          type="text"
          required
          autoComplete="off"
          disabled={status === 'saving'}
        />
      </div>

      <div className="form-group">
        <label htmlFor="post-job-description">Description *</label>
        <textarea
          id="post-job-description"
          name="description"
          rows={8}
          required
          disabled={status === 'saving'}
          placeholder="What will they do day to day?"
        />
      </div>

      <div className="form-group">
        <label htmlFor="post-job-requirements">Requirements</label>
        <textarea
          id="post-job-requirements"
          name="requirements"
          rows={4}
          disabled={status === 'saving'}
          placeholder="One requirement per line"
        />
      </div>

      <div className="employer-job-form-salary-grid">
        <div className="form-group">
          <label htmlFor="post-salary-min">Salary range (min, $)</label>
          <input
            id="post-salary-min"
            name="salaryMin"
            type="number"
            min={0}
            step={1000}
            placeholder="50000"
            disabled={status === 'saving'}
          />
        </div>
        <div className="form-group">
          <label htmlFor="post-salary-max">Salary range (max, $)</label>
          <input
            id="post-salary-max"
            name="salaryMax"
            type="number"
            min={0}
            step={1000}
            placeholder="85000"
            disabled={status === 'saving'}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="post-job-location">Location</label>
        <input
          id="post-job-location"
          name="location"
          type="text"
          placeholder="e.g. Austin, TX or Remote"
          disabled={status === 'saving'}
        />
      </div>

      <div className="form-group">
        <label htmlFor="post-job-type">Job type</label>
        <select id="post-job-type" name="jobType" defaultValue="fulltime" disabled={status === 'saving'}>
          <option value="fulltime">Full-time</option>
          <option value="parttime">Part-time</option>
          <option value="contract">Contract</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
        <button type="submit" className="btn btn-primary" disabled={status === 'saving'} aria-busy={status === 'saving'}>
          <span aria-live="polite">
            {status === 'saving' ? 'Publishing…' : 'Publish job'}
          </span>
        </button>
        <Link href="/employer/jobs" className="btn btn-outline" style={{ textDecoration: 'none' }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
