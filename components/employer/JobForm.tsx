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

type FieldErrors = Partial<Record<'title' | 'location' | 'salaryMin' | 'salaryMax' | 'description' | 'requirements', string>>;

export default function JobForm({ job, initialData, companyName, programSlugs }: JobFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const isEdit = !!job && !!job.id;
  const prefill = job ?? initialData;

  const initialHaystack = [prefill?.title, prefill?.description, ...(prefill?.requirements ?? [])]
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
    const salaryMin = formData.get('salaryMin') ? parseInt(String(formData.get('salaryMin')), 10) : null;
    const salaryMax = formData.get('salaryMax') ? parseInt(String(formData.get('salaryMax')), 10) : null;
    const payload = {
      title: String(formData.get('title') || '').trim(),
      location: String(formData.get('location') || '').trim() || undefined,
      locationType: (formData.get('locationType') as string) || 'onsite',
      jobType: (formData.get('jobType') as string) || 'fulltime',
      salaryMin,
      salaryMax,
      description: String(formData.get('description') || '').trim(),
      requirements,
      preferredCertifications: certs,
      suggestedPrograms: programs,
      status: submitForReview ? 'pending' : 'draft',
    };

    const nextFieldErrors: FieldErrors = {};
    if (!payload.title) nextFieldErrors.title = 'Add a job title.';
    if (!payload.description) nextFieldErrors.description = 'Add a job description.';
    if (salaryMin != null && salaryMax != null && salaryMax < salaryMin) {
      nextFieldErrors.salaryMax = 'Salary max must be greater than or equal to salary min.';
    }
    if (submitForReview) {
      if (!payload.location) nextFieldErrors.location = 'Add where people work before submitting for review.';
      if (requirements.length < 2) nextFieldErrors.requirements = 'Add at least 2 requirement lines before submitting for review.';
    }

    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      setErrorMsg('Please fix the highlighted fields.');
      setStatus('error');
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

  const fieldErrorId = (name: keyof FieldErrors) => `job-form-error-${name}`;

  return (
    <form ref={formRef} className="employer-job-form" onSubmit={handleSubmit} noValidate>
      {status === 'error' && errorMsg && (
        <div className="employer-job-form-error" role="alert">
          {errorMsg}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="job-title">Job Title *</label>
        <input id="job-title" type="text" name="title" required defaultValue={prefill?.title} disabled={status === 'saving'} aria-invalid={!!fieldErrors.title} aria-describedby={fieldErrors.title ? fieldErrorId('title') : undefined} />
        {fieldErrors.title ? <p id={fieldErrorId('title')} className="form-error">{fieldErrors.title}</p> : null}
      </div>

      <div className="form-group">
        <label htmlFor="company-name">Company Name</label>
        <input id="company-name" type="text" value={companyName} readOnly disabled className="employer-job-form-readonly" />
      </div>

      <div className="form-group">
        <label htmlFor="job-location">Location (City, State or Remote)</label>
        <input id="job-location" type="text" name="location" placeholder="e.g. Austin, TX or Remote" defaultValue={prefill?.location ?? ''} disabled={status === 'saving'} aria-invalid={!!fieldErrors.location} aria-describedby={fieldErrors.location ? fieldErrorId('location') : undefined} />
        {fieldErrors.location ? <p id={fieldErrorId('location')} className="form-error">{fieldErrors.location}</p> : null}
      </div>

      <div className="form-group">
        <label htmlFor="job-location-type">Location Type</label>
        <select id="job-location-type" name="locationType" defaultValue={prefill?.locationType ?? 'onsite'} disabled={status === 'saving'}>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="job-type">Job Type</label>
        <select id="job-type" name="jobType" defaultValue={prefill?.jobType ?? 'fulltime'} disabled={status === 'saving'}>
          <option value="fulltime">Full-time</option>
          <option value="parttime">Part-time</option>
          <option value="contract">Contract</option>
        </select>
      </div>

      <div className="employer-job-form-salary-grid">
        <div className="form-group">
          <label htmlFor="salary-min">Salary Min (optional)</label>
          <input id="salary-min" type="number" name="salaryMin" placeholder="50000" defaultValue={prefill?.salaryMin ?? ''} disabled={status === 'saving'} aria-invalid={!!fieldErrors.salaryMin} aria-describedby={fieldErrors.salaryMin ? fieldErrorId('salaryMin') : undefined} />
          {fieldErrors.salaryMin ? <p id={fieldErrorId('salaryMin')} className="form-error">{fieldErrors.salaryMin}</p> : null}
        </div>
        <div className="form-group">
          <label htmlFor="salary-max">Salary Max (optional)</label>
          <input id="salary-max" type="number" name="salaryMax" placeholder="70000" defaultValue={prefill?.salaryMax ?? ''} disabled={status === 'saving'} aria-invalid={!!fieldErrors.salaryMax} aria-describedby={fieldErrors.salaryMax ? fieldErrorId('salaryMax') : undefined} />
          {fieldErrors.salaryMax ? <p id={fieldErrorId('salaryMax')} className="form-error">{fieldErrors.salaryMax}</p> : null}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="job-description">Job Description *</label>
        <textarea id="job-description" name="description" rows={8} required defaultValue={prefill?.description} disabled={status === 'saving'} aria-invalid={!!fieldErrors.description} aria-describedby={fieldErrors.description ? fieldErrorId('description') : undefined} />
        {fieldErrors.description ? <p id={fieldErrorId('description')} className="form-error">{fieldErrors.description}</p> : null}
      </div>

      <div className="form-group">
        <label htmlFor="job-requirements">Requirements (one per line)</label>
        <textarea id="job-requirements" name="requirements" rows={4} placeholder="2+ years experience&#10;Bachelor's degree&#10;Proficiency in Python" defaultValue={prefill?.requirements?.join('\n') ?? ''} disabled={status === 'saving'} aria-invalid={!!fieldErrors.requirements} aria-describedby={fieldErrors.requirements ? fieldErrorId('requirements') : undefined} />
        {fieldErrors.requirements ? <p id={fieldErrorId('requirements')} className="form-error">{fieldErrors.requirements}</p> : null}
      </div>

      <div className="form-group">
        <label htmlFor="job-certs">Preferred Certifications (comma-separated)</label>
        <input id="job-certs" type="text" name="preferredCertifications" placeholder="CompTIA A+, AWS Certified" defaultValue={prefill?.preferredCertifications?.join(', ') ?? ''} disabled={status === 'saving'} />
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
          <button type="submit" name="submitForReview" value="1" className="btn btn-accent" disabled={status === 'saving'}>
            Submit for Review
          </button>
        )}
        {job && job.status === 'closed' && (
          <button type="submit" name="resubmitForReview" value="1" className="btn btn-accent" disabled={status === 'saving'}>
            Resubmit for Review
          </button>
        )}
      </div>
    </form>
  );
}
