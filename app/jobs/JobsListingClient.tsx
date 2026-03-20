'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Clock, Search, SlidersHorizontal, X } from 'lucide-react';
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
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'salary-desc', label: 'Salary (high to low)' },
  { value: 'salary-asc', label: 'Salary (low to high)' },
];

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
            placeholder="e.g. 50000"
            value={salaryMin}
            onChange={(e) => updateUrl({ salaryMin: e.target.value || undefined })}
            className="job-filter-input"
          />
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
            placeholder="e.g. 120000"
            value={salaryMax}
            onChange={(e) => updateUrl({ salaryMax: e.target.value || undefined })}
            className="job-filter-input"
          />
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
    <div className="job-board">
      <div className="job-board-header">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="job-filters-toggle"
          aria-expanded={filtersOpen}
          aria-controls="job-filters-drawer"
        >
          <SlidersHorizontal size={18} />
          Filters {hasActiveFilters ? `(${[
            q && 'search',
            locationType && 'location',
            jobType && 'type',
            program && 'program',
            (salaryMin || salaryMax) && 'salary',
            sort !== 'newest' && 'sort',
          ]
            .filter(Boolean)
            .length })` : ''}
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
        <p className="job-loading">Loading jobs…</p>
      ) : jobs.length === 0 ? (
        <p className="job-empty">
          No jobs match your filters. Try adjusting your search or{' '}
          <button type="button" onClick={clearFilters} className="job-empty-link">
            clear all filters
          </button>
          .
        </p>
      ) : (
        <>
          <p className="job-count">
            {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} found
          </p>
          <div className="job-list">
            {jobs.map((j) => (
              <Link key={j.id} href={`/jobs/${j.id}`} className="job-card">
                <div className="job-card-main">
                  <div>
                    <h3 className="job-card-title">{j.title}</h3>
                    <p className="job-card-company">{j.employer.companyName}</p>
                  </div>
                  <div className="job-card-meta">
                    <span>
                      <MapPin size={14} aria-hidden />
                      {j.location ?? LOCATION_LABELS[j.locationType] ?? j.locationType}
                    </span>
                    <span>
                      <Clock size={14} aria-hidden />
                      {JOB_TYPE_LABELS[j.jobType] ?? j.jobType}
                    </span>
                  </div>
                </div>
                {(j.salaryMin ?? j.salaryMax) && (
                  <p className="job-card-salary">
                    ${(j.salaryMin ?? 0).toLocaleString()} – $
                    {(j.salaryMax ?? 0).toLocaleString()}/yr
                  </p>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
