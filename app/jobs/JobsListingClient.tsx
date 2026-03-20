'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, MapPin, Clock, DollarSign } from 'lucide-react';

type Job = {
  id: string;
  title: string;
  location: string | null;
  locationType: string;
  jobType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  employer: { companyName: string; logoUrl: string | null };
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

function formatSalary(min: number | null, max: number | null): string {
  if (min != null && max != null) return `$${min.toLocaleString()} – $${max.toLocaleString()}/yr`;
  if (min != null) return `From $${min.toLocaleString()}/yr`;
  if (max != null) return `Up to $${max.toLocaleString()}/yr`;
  return '';
}

function JobCardSkeleton() {
  return (
    <div className="job-card job-card--skeleton" aria-hidden>
      <div className="job-card__logo job-card__logo--skeleton" />
      <div className="job-card__body">
        <div className="job-card__skeleton-line job-card__skeleton-line--title" />
        <div className="job-card__skeleton-line job-card__skeleton-line--company" />
        <div className="job-card__meta">
          <div className="job-card__skeleton-line job-card__skeleton-line--meta" />
          <div className="job-card__skeleton-line job-card__skeleton-line--meta" />
        </div>
        <div className="job-card__skeleton-line job-card__skeleton-line--salary" />
      </div>
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const locationDisplay = job.location ?? LOCATION_LABELS[job.locationType] ?? job.locationType;
  const salaryStr = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <Link href={`/jobs/${job.id}`} className="job-card">
      <div className="job-card__logo">
        {job.employer.logoUrl ? (
          <img
            src={job.employer.logoUrl}
            alt=""
            width={56}
            height={56}
            className="job-card__logo-img"
          />
        ) : (
          <div className="job-card__logo-placeholder" aria-hidden>
            <Briefcase size={24} />
          </div>
        )}
      </div>
      <div className="job-card__body">
        <h3 className="job-card__title">{job.title}</h3>
        <p className="job-card__company">{job.employer.companyName}</p>
        <div className="job-card__meta">
          <span className="job-card__meta-item">
            <MapPin size={14} aria-hidden />
            {locationDisplay}
          </span>
          <span className="job-card__meta-item">
            <Clock size={14} aria-hidden />
            {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
          </span>
        </div>
        {salaryStr && (
          <p className="job-card__salary">
            <DollarSign size={14} aria-hidden />
            {salaryStr}
          </p>
        )}
      </div>
      <span className="job-card__arrow" aria-hidden>
        →
      </span>
    </Link>
  );
}

function JobsEmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="jobs-empty-state">
      <div className="jobs-empty-state__icon" aria-hidden>
        <Briefcase size={48} strokeWidth={1.5} />
      </div>
      <h3 className="jobs-empty-state__title">No jobs match your filters</h3>
      <p className="jobs-empty-state__text">
        No openings are available for the selected location or job type. Try adjusting your filters
        or check back soon.
      </p>
      <button type="button" className="btn btn-outline" onClick={onClearFilters}>
        Clear filters
      </button>
    </div>
  );
}

function JobsNoResultsState() {
  return (
    <div className="jobs-empty-state">
      <div className="jobs-empty-state__icon" aria-hidden>
        <Briefcase size={48} strokeWidth={1.5} />
      </div>
      <h3 className="jobs-empty-state__title">No jobs available at the moment</h3>
      <p className="jobs-empty-state__text">
        Check back soon for new openings from WorkforceAP employer partners.
      </p>
    </div>
  );
}

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

  const hasFilters = !!(filter.locationType || filter.jobType);

  return (
    <div className="jobs-listing">
      <div className="jobs-filters">
        <span className="jobs-filters__label">Filter:</span>
        <select
          value={filter.locationType ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, locationType: e.target.value || undefined }))}
          className="jobs-filters__select"
          aria-label="Filter by location type"
        >
          <option value="">All locations</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </select>
        <select
          value={filter.jobType ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, jobType: e.target.value || undefined }))}
          className="jobs-filters__select"
          aria-label="Filter by job type"
        >
          <option value="">All types</option>
          <option value="fulltime">Full-time</option>
          <option value="parttime">Part-time</option>
          <option value="contract">Contract</option>
        </select>
      </div>

      {loading ? (
        <div className="jobs-grid" aria-busy="true" aria-live="polite">
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        hasFilters ? (
          <JobsEmptyState onClearFilters={() => setFilter({})} />
        ) : (
          <JobsNoResultsState />
        )
      ) : (
        <div className="jobs-grid">
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      )}
    </div>
  );
}
