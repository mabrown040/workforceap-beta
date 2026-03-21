'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SuggestedProgramsRanked from '@/components/employer/SuggestedProgramsRanked';

type JobFormProps = {
  job?: {
    id: string;
    title: string;
    location?: string | null;
    locationType: string;
    jobType: string;
    salaryMin?: number | null;
    salaryMax?: number | null;
    description: string;
    requirements: string[];
    preferredCertifications: string[];
    suggestedPrograms: string[];
    status: string;
  };
  /** Pre-filled data for new job (e.g. from import). Form will POST, not PATCH. */
  initialData?: Partial<{
    title: string;
    location: string;
    locationType: string;
    jobType: string;
    salaryMin: number;
    salaryMax: number;
    description: string;
    requirements: string[];
    preferredCertifications: string[];
    suggestedPrograms: string[];
  }>;
  companyName: string;
  programSlugs: string[];
};

export default function JobForm({ job, initialData, companyName, programSlugs }: JobFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEdit = !!job && !!job.id;
  const prefill = job ?? initialData;

  const initialHaystack = [
    prefill?.title,
    prefill?.description,
    ...(prefill?.requirements ?? []),
  ]
    .filter(Boolean)
    .join(' ');

  const defaultPrograms = prefill?.suggestedPrograms ?? [];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const requirements = String(formData.get('requirements') || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const certs = String(formData.get('preferredCertifications') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const programs = Array.from(formData.getAll('suggestedPrograms') as string[]);

    const submitForReview = !!formData.get('submitForReview') || !!formData.get('resubmitForReview');
    const payload = {
      title: String(formData.get('title') || '').trim(),
      location: String(formData.get('location') || '').trim() || undefined,
      locationType: (formData.get('locationType') as string) || 'onsite',
      jobType: (formData.get('jobType') as string) || 'fulltime',
      salaryMin: formData.get('salaryMin') ? parseInt(String(formData.get('salaryMin')), 10) : null,
      salaryMax: formData.get('salaryMax') ? parseInt(String(formData.get('salaryMax')), 10) : null,
      description: String(formData.get('description') || '').trim(),
      requirements,
      preferredCertifications: certs,
      suggestedPrograms: programs,
      status: submitForReview ? 'pending' : 'draft',
    };

    if (!payload.title || !payload.description) {
      setErrorMsg('Title and description are required.');
      return;
    }

    setStatus('saving');
    setErrorMsg(null);

    try {
      const url = isEdit ? `/api/employer/jobs/${job.id}` : '/api/employer/jobs';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error ?? 'Failed to save');
        return;
      }

      router.push('/employer/jobs');
      router.refresh();
    } catch {
      setStatus('error');
      setErrorMsg('Network error');
    }
  }

  return (
    <form ref={formRef} className="employer-job-form" onSubmit={handleSubmit}>
      {status === 'error' && errorMsg && (
        <div className="employer-job-form-error" role="alert">
          {errorMsg}
        </div>
      )}

      <div className="form-group">
        <label>Job Title *</label>
        <input
          type="text"
          name="title"
          required
          defaultValue={prefill?.title}
          disabled={status === 'saving'}
        />
      </div>

      <div className="form-group">
        <label>Company Name</label>
        <input type="text" value={companyName} readOnly disabled className="employer-job-form-readonly" />
      </div>

      <div className="form-group">
        <label>Location (City, State or Remote)</label>
        <input
          type="text"
          name="location"
          placeholder="e.g. Austin, TX or Remote"
          defaultValue={prefill?.location ?? ''}
          disabled={status === 'saving'}
        />
      </div>

      <div className="form-group">
        <label>Location Type</label>
        <select name="locationType" defaultValue={prefill?.locationType ?? 'onsite'} disabled={status === 'saving'}>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </select>
      </div>

      <div className="form-group">
        <label>Job Type</label>
        <select name="jobType" defaultValue={prefill?.jobType ?? 'fulltime'} disabled={status === 'saving'}>
          <option value="fulltime">Full-time</option>
          <option value="parttime">Part-time</option>
          <option value="contract">Contract</option>
        </select>
      </div>

      <div className="employer-job-form-salary-grid">
        <div className="form-group">
          <label>Salary Min (optional)</label>
          <input
            type="number"
            name="salaryMin"
            placeholder="50000"
            defaultValue={prefill?.salaryMin ?? ''}
            disabled={status === 'saving'}
          />
        </div>
        <div className="form-group">
          <label>Salary Max (optional)</label>
          <input
            type="number"
            name="salaryMax"
            placeholder="70000"
            defaultValue={prefill?.salaryMax ?? ''}
            disabled={status === 'saving'}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Job Description *</label>
        <textarea
          name="description"
          rows={8}
          required
          defaultValue={prefill?.description}
          disabled={status === 'saving'}
        />
      </div>

      <div className="form-group">
        <label>Requirements (one per line)</label>
        <textarea
          name="requirements"
          rows={4}
          placeholder="2+ years experience&#10;Bachelor's degree&#10;Proficiency in Python"
          defaultValue={prefill?.requirements?.join('\n') ?? ''}
          disabled={status === 'saving'}
        />
      </div>

      <div className="form-group">
        <label>Preferred Certifications (comma-separated)</label>
        <input
          type="text"
          name="preferredCertifications"
          placeholder="CompTIA A+, AWS Certified"
          defaultValue={prefill?.preferredCertifications?.join(', ') ?? ''}
          disabled={status === 'saving'}
        />
      </div>

      {programSlugs.length > 0 && (
        <SuggestedProgramsRanked
          formRef={formRef}
          programSlugs={programSlugs}
          defaultSelected={defaultPrograms}
          initialHaystack={initialHaystack}
          disabled={status === 'saving'}
        />
      )}

      <div className="employer-job-form-actions">
        <button type="submit" className="btn btn-primary" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save as Draft'}
        </button>
        {(!isEdit || (job && job.status === 'draft')) && (
          <button
            type="submit"
            name="submitForReview"
            value="1"
            className="btn btn-accent"
            disabled={status === 'saving'}
          >
            Submit for Review
          </button>
        )}
        {job && job.status === 'closed' && (
          <button
            type="submit"
            name="resubmitForReview"
            value="1"
            className="btn btn-accent"
            disabled={status === 'saving'}
          >
            Resubmit for Review
          </button>
        )}
      </div>
    </form>
  );
}
