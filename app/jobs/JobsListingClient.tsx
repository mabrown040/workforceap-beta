'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, MapPin, Clock, DollarSign, Search, SlidersHorizontal, X } from 'lucide-react';
import { PROGRAMS } from '@/lib/content/programs';

const DEBOUNCE_MS = 400;

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
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'salary-desc', label: 'Salary (high to low)' },
  { value: 'salary-asc', label: 'Salary (low to high)' },
];

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
        Try adjusting your filters or clear them to see all available jobs.
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
        New roles appear as employer partners post them. In the meantime, explore programs or start your application—we
        will help you get job-ready.
      </p>
      <div className="jobs-empty-state__actions">
        <Link href="/programs" className="btn btn-primary">
          Browse programs
        </Link>
        <Link href="/apply" className="btn btn-outline">
          Apply for training
        </Link>
        <Link href="/employers" className="btn btn-ghost">
          For employers
        </Link>
      </div>
    </div>
  );
}

export default function JobsListingClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const qParam = searchParams.get('q') ?? '';
  const [qLocal, setQLocal] = useState(qParam);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQLocal(qParam);
  }, [qParam]);

  const locationType = searchParams.get('locationType') ?? '';
  const jobType = searchParams.get('jobType') ?? '';
  const program = searchParams.get('program') ?? '';
  const salaryMin = searchParams.get('salaryMin') ?? '';
  const salaryMax = searchParams.get('salaryMax') ?? '';
  const sort = searchParams.get('sort') ?? 'newest';
  const q = qParam;

  const updateUrl = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const handleKeywordChange = (value: string) => {
    setQLocal(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateUrl({ q: value.trim() || undefined });
      debounceRef.current = null;
    }, DEBOUNCE_MS);
  };

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const hasActiveFilters =
    q || locationType || jobType || program || salaryMin || salaryMax || sort !== 'newest';

  const clearFilters = () => {
    router.push(pathname);
    setFiltersOpen(false);
  };

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (locationType) params.set('locationType', locationType);
    if (jobType) params.set('jobType', jobType);
    if (program) params.set('program', program);
    if (salaryMin) params.set('salaryMin', salaryMin);
    if (salaryMax) params.set('salaryMax', salaryMax);
    if (sort && sort !== 'newest') params.set('sort', sort);

    setLoading(true);
    fetch(`/api/jobs?${params}`)
      .then((r) => r.json())
      .then(setJobs)
      .finally(() => setLoading(false));
  }, [q, locationType, jobType, program, salaryMin, salaryMax, sort]);

  const filterPanel = (
    <div className="job-filters-panel">
      <div className="job-filter-group">
        <label htmlFor="job-search-q" className="job-filter-label">
          Keyword search
        </label>
        <div className="job-search-input-wrap">
          <Search size={18} className="job-search-icon" aria-hidden />
          <input
            id="job-search-q"
            type="search"
            placeholder="Search titles, companies..."
            value={qLocal}
            onChange={(e) => handleKeywordChange(e.target.value)}
            className="job-search-input"
          />
        </div>
      </div>

      <div className="job-filter-group">
        <label htmlFor="job-filter-program" className="job-filter-label">
          Program
        </label>
        <select
          id="job-filter-program"
          value={program}
          onChange={(e) => updateUrl({ program: e.target.value || undefined })}
          className="job-filter-select"
        >
          <option value="">All programs</option>
          {PROGRAMS.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      <div className="job-filter-group">
        <label htmlFor="job-filter-location" className="job-filter-label">
          Location type
        </label>
        <select
          id="job-filter-location"
          value={locationType}
          onChange={(e) => updateUrl({ locationType: e.target.value || undefined })}
          className="job-filter-select"
          aria-label="Filter by location type"
        >
          <option value="">All locations</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </select>
      </div>

      <div className="job-filter-group">
        <label htmlFor="job-filter-type" className="job-filter-label">
          Job type
        </label>
        <select
          id="job-filter-type"
          value={jobType}
          onChange={(e) => updateUrl({ jobType: e.target.value || undefined })}
          className="job-filter-select"
          aria-label="Filter by job type"
        >
          <option value="">All types</option>
          <option value="fulltime">Full-time</option>
          <option value="parttime">Part-time</option>
          <option value="contract">Contract</option>
        </select>
      </div>

      <div className="job-filter-row">
        <div className="job-filter-group">
          <label htmlFor="job-filter-salary-min" className="job-filter-label">
            Min salary ($/yr)
          </label>
          <input
            id="job-filter-salary-min"
            type="number"
            min={0}
            step={5000}
            placeholder="50000"
            aria-describedby="job-filter-salary-min-hint"
            value={salaryMin}
            onChange={(e) => updateUrl({ salaryMin: e.target.value || undefined })}
            className="job-filter-input"
          />
          <span id="job-filter-salary-min-hint" className="job-filter-hint">
            Annual USD, no commas (e.g. 50000 ≈ $50k).
          </span>
        </div>
        <div className="job-filter-group">
          <label htmlFor="job-filter-salary-max" className="job-filter-label">
            Max salary ($/yr)
          </label>
          <input
            id="job-filter-salary-max"
            type="number"
            min={0}
            step={5000}
            placeholder="120000"
            aria-describedby="job-filter-salary-max-hint"
            value={salaryMax}
            onChange={(e) => updateUrl({ salaryMax: e.target.value || undefined })}
            className="job-filter-input"
          />
          <span id="job-filter-salary-max-hint" className="job-filter-hint">
            Leave blank for no upper limit.
          </span>
        </div>
      </div>

      <div className="job-filter-group">
        <label htmlFor="job-filter-sort" className="job-filter-label">
          Sort by
        </label>
        <select
          id="job-filter-sort"
          value={sort}
          onChange={(e) => updateUrl({ sort: e.target.value })}
          className="job-filter-select"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <button type="button" onClick={clearFilters} className="job-filter-clear">
          <X size={14} />
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="job-board jobs-listing">
      <div className="job-board-header">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="job-filters-toggle"
          aria-expanded={filtersOpen}
          aria-controls="job-filters-drawer"
        >
          <SlidersHorizontal size={18} />
          Filters{hasActiveFilters ? ` (${[q && 'search', locationType && 'location', jobType && 'type', program && 'program', (salaryMin || salaryMax) && 'salary', sort !== 'newest' && 'sort'].filter(Boolean).length})` : ''}
        </button>

        <div className="job-filters-desktop">{filterPanel}</div>
      </div>

      <div
        id="job-filters-drawer"
        className={`job-filters-drawer ${filtersOpen ? 'is-open' : ''}`}
        aria-hidden={!filtersOpen}
      >
        <div className="job-filters-drawer-inner">
          <div className="job-filters-drawer-header">
            <h3>Filters</h3>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="job-filters-drawer-close"
              aria-label="Close filters"
            >
              <X size={20} />
            </button>
          </div>
          {filterPanel}
        </div>
        <button
          type="button"
          className="job-filters-drawer-backdrop"
          onClick={() => setFiltersOpen(false)}
          aria-label="Close filters"
        />
      </div>

      {loading ? (
        <div className="jobs-grid" aria-busy="true" aria-live="polite">
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        hasActiveFilters ? (
          <JobsEmptyState onClearFilters={clearFilters} />
        ) : (
          <JobsNoResultsState />
        )
      ) : (
        <>
          <p className="job-count">
            {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} found
          </p>
          <div className="jobs-grid">
            {jobs.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
