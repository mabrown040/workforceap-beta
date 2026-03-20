'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, MapPin, Clock } from 'lucide-react';

type Job = {
  id: string;
  title: string;
  location: string | null;
  locationType: string;
  jobType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  employer: { companyName: string };
};

const LOCATION_LABELS: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
};
const JOB_TYPE_LABELS: Record<string, string> = {
  fulltime: 'Full-time',
  parttime: 'Part-time',
  contract: 'Contract',
};

export default function JobsListingClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ locationType?: string; jobType?: string }>({});

  useEffect(() => {
    const params = new URLSearchParams(filter);
    fetch(`/api/jobs?${params}`)
      .then((r) => r.json())
      .then(setJobs)
      .finally(() => setLoading(false));
  }, [filter.locationType, filter.jobType]);

  if (loading) return <p style={{ color: 'var(--color-gray-500)' }}>Loading jobs…</p>;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontWeight: 600 }}>Filter:</span>
        <select
          value={filter.locationType ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, locationType: e.target.value || undefined }))}
          style={{ padding: '0.5rem' }}
        >
          <option value="">All locations</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </select>
        <select
          value={filter.jobType ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, jobType: e.target.value || undefined }))}
          style={{ padding: '0.5rem' }}
        >
          <option value="">All types</option>
          <option value="fulltime">Full-time</option>
          <option value="parttime">Part-time</option>
          <option value="contract">Contract</option>
        </select>
      </div>

      {jobs.length === 0 ? (
        <p style={{ color: 'var(--color-gray-500)' }}>No jobs available at the moment. Check back soon.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {jobs.map((j) => (
            <Link
              key={j.id}
              href={`/jobs/${j.id}`}
              style={{
                display: 'block',
                padding: '1.25rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-light)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-accent)' }}>{j.title}</h3>
                  <p style={{ margin: '0.35rem 0 0', color: 'var(--color-gray-600)', fontSize: '0.95rem' }}>
                    {j.employer.companyName}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>
                  <span>
                    <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                    {j.location ?? LOCATION_LABELS[j.locationType] ?? j.locationType}
                  </span>
                  <span>
                    <Clock size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                    {JOB_TYPE_LABELS[j.jobType] ?? j.jobType}
                  </span>
                </div>
              </div>
              {(j.salaryMin ?? j.salaryMax) && (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--color-gray-600)' }}>
                  ${(j.salaryMin ?? 0).toLocaleString()} – ${(j.salaryMax ?? 0).toLocaleString()}/yr
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
