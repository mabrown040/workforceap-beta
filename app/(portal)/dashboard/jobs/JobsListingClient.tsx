'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Briefcase, MapPin, Clock, DollarSign, Search, SlidersHorizontal, X } from 'lucide-react';
import { PROGRAMS } from '@/lib/content/programs';
import { formatJobSalaryRange } from '@/lib/jobs/formatSalary';

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

type MatchedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  locationType: string;
  matchPct: number;
};

function getLocationLabels(t: (k: string) => string): Record<string, string> {
  return {
    remote: t('remote'),
    hybrid: t('hybrid'),
    onsite: t('onsite'),
  };
}
function getJobTypeLabels(t: (k: string) => string): Record<string, string> {
  return {
    fulltime: t('fulltime'),
    parttime: t('parttime'),
    contract: t('contract'),
  };
}
function getSortOptions(t: (k: string) => string): { value: string; label: string }[] {
  return [
    { value: 'newest', label: t('newestFirst') },
    { value: 'title', label: t('titleAZ') },
    { value: 'salary-desc', label: t('salaryHighToLow') },
    { value: 'salary-asc', label: t('salaryLowToHigh') },
  ];
}

function formatSalary(min: number | null, max: number | null): string {
  return formatJobSalaryRange(min, max) ?? '';
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

function JobCard({
  job,
  isAuthenticated,
  matchPct,
  isApplied,
  t,
}: {
  job: Job;
  isAuthenticated: boolean;
  matchPct?: number;
  isApplied?: boolean;
  t: (k: string) => string;
}) {
  const locationDisplay = job.location ?? getLocationLabels(t)[job.locationType] ?? job.locationType;
  const salaryStr = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <Link
      href={isAuthenticated ? `/dashboard/jobs/${job.id}` : `/login?redirectTo=${encodeURIComponent(`/dashboard/jobs/${job.id}`)}`}
      className="job-card"
    >
      <div className="job-card__logo">
        {job.employer.logoUrl ? (
          <Image
            src={job.employer.logoUrl}
            alt=""
            width={56}
            height={56}
            unoptimized
            className="job-card__logo-img"
          />
        ) : (
          <div className="job-card__logo-placeholder" aria-hidden>
            <Briefcase size={24} />
          </div>
        )}
      </div>
      <div className="job-card__body">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', justifyContent: 'space-between' }}>
          <h3 className="job-card__title" style={{ margin: 0, flex: 1 }}>{job.title}</h3>
          <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {isApplied && (
              <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'color-mix(in srgb, var(--color-green) 12%, transparent)', color: 'var(--color-green)', border: '1px solid color-mix(in srgb, var(--color-green) 30%, transparent)', borderRadius: '999px', padding: '0.15rem 0.5rem' }}>
                Applied
              </span>
            )}
            {matchPct !== undefined && matchPct > 0 && (
              <span style={{
                fontSize: '0.7rem', fontWeight: 700,
                background: matchPct >= 70 ? 'rgba(13,148,136,0.12)' : matchPct >= 40 ? 'rgba(217,119,6,0.12)' : 'rgba(107,114,128,0.12)',
                color: matchPct >= 70 ? '#0d9488' : matchPct >= 40 ? '#d97706' : '#6b7280',
                border: `1px solid ${matchPct >= 70 ? 'rgba(13,148,136,0.3)' : matchPct >= 40 ? 'rgba(217,119,6,0.3)' : 'rgba(107,114,128,0.3)'}`,
                borderRadius: '999px', padding: '0.15rem 0.5rem',
              }}>
                {matchPct}% {t('match')}
              </span>
            )}
          </div>
        </div>
        <p className="job-card__company">{job.employer.companyName}</p>
        <div className="job-card__meta">
          <span className="job-card__meta-item">
            <MapPin size={14} aria-hidden />
            {locationDisplay}
          </span>
          <span className="job-card__meta-item">
            <Clock size={14} aria-hidden />
            {getJobTypeLabels(t)[job.jobType] ?? job.jobType}
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

function JobsEmptyState({ onClearFilters, t }: { onClearFilters: () => void; t: (k: string) => string }) {
  return (
    <div className="jobs-empty-state">
      <div className="jobs-empty-state__icon" aria-hidden>
        <Briefcase size={48} strokeWidth={1.5} />
      </div>
      <h3 className="jobs-empty-state__title">{t('noJobsMatchFilters')}</h3>
      <p className="jobs-empty-state__text">
        {t('tryAdjustingFilters')}
      </p>
      <button type="button" className="btn btn-outline" onClick={onClearFilters}>
        {t('clearFilters')}
      </button>
    </div>
  );
}

function JobsNoResultsState({ isAuthenticated, t }: { isAuthenticated: boolean; t: (k: string) => string }) {
  if (isAuthenticated) {
    return (
      <div className="jobs-empty-state">
        <div className="jobs-empty-state__icon" aria-hidden>
          <Briefcase size={48} strokeWidth={1.5} />
        </div>
        <h3 className="jobs-empty-state__title">{t('noOpeningsListed')}</h3>
        <p className="jobs-empty-state__text">
          {t('newRolesAppear')}
        </p>
        <div className="jobs-empty-state__actions">
          <Link href="/dashboard/messages" className="btn btn-primary">
            {t('messageCounselor')}
          </Link>
          <Link href="/dashboard/ai-tools/job-match-scorer" className="btn btn-outline">
            {t('improveJobMatches')}
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="jobs-empty-state">
      <div className="jobs-empty-state__icon" aria-hidden>
        <Briefcase size={48} strokeWidth={1.5} />
      </div>
      <h3 className="jobs-empty-state__title">{t('noJobsAvailable')}</h3>
      <p className="jobs-empty-state__text">
        {t('newJobsAddedRegularly')}
      </p>
      <div className="jobs-empty-state__actions">
        <Link href="/programs" className="btn btn-primary">
          {t('browsePrograms')}
        </Link>
        <Link href="/apply" className="btn btn-outline">
          {t('applyForTraining')}
        </Link>
        <Link href="/employers" className="btn btn-ghost">
          {t('forEmployers')}
        </Link>
      </div>
    </div>
  );
}

export default function JobsListingClient({
  isAuthenticated = true,
  ageGroup = 'adult18plus' as 'under14' | 'youth14to17' | 'adult18plus',
  initialJobs = [] as Job[],
  initialTotal = 0,
  appliedJobIds = [] as string[],
}: {
  isAuthenticated?: boolean;
  ageGroup?: 'under14' | 'youth14to17' | 'adult18plus';
  initialJobs?: Job[];
  initialTotal?: number;
  appliedJobIds?: string[];
}) {
  const t = useTranslations('jobs');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Use SSR data as initial state; skip loading state if we have initial data
  const hasInitialData = initialJobs.length > 0;
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [matchedJobs, setMatchedJobs] = useState<MatchedJob[]>([]);
  const appliedSet = new Set(appliedJobIds);
  const [loading, setLoading] = useState(!hasInitialData);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const qParam = (searchParams?.get('q') ?? '') ?? '';
  const [qLocal, setQLocal] = useState(qParam);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQLocal(qParam);
  }, [qParam]);

  const locationType = searchParams?.get('locationType') ?? '';
  const jobType = searchParams?.get('jobType') ?? '';
  const program = searchParams?.get('program') ?? '';
  const salaryMin = searchParams?.get('salaryMin') ?? '';
  const salaryMax = searchParams?.get('salaryMax') ?? '';
  const sort = searchParams?.get('sort') ?? 'newest';
  const q = qParam;

  const updateUrl = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      if (pathname) router.push(qs ? `${pathname}?${qs}` : pathname);
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
    if (pathname) router.push(pathname);
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

    if (ageGroup) params.set('ageGroup', ageGroup);
    
    // Skip the first fetch if we have SSR data and no filters are active
    if (initialJobs.length > 0 && !hasActiveFilters) {
      return;
    }
    
    setLoading(true);
    fetch(`/api/dashboard/jobs?${params}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setJobs(data); })
      .finally(() => setLoading(false));
  }, [q, locationType, jobType, program, salaryMin, salaryMax, sort, ageGroup, hasActiveFilters, initialJobs.length]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoadingMatches(true);
    fetch('/api/member/matched-jobs')
      .then((r) => (r.ok ? r.json() : { jobs: [] }))
      .then((d) => setMatchedJobs(d.jobs ?? []))
      .catch(() => setMatchedJobs([]))
      .finally(() => setLoadingMatches(false));
  }, [isAuthenticated]);

  const filterPanel = (
    <div className="job-filters-panel">
      <div className="job-filter-group">
        <label htmlFor="job-search-q" className="job-filter-label">
          {t('searchJobs')}
        </label>
        <div className="job-search-input-wrap">
          <Search size={18} className="job-search-icon" aria-hidden />
          <input
            id="job-search-q"
            type="search"
            placeholder="Titles, companies, keywords…"
            value={qLocal}
            onChange={(e) => handleKeywordChange(e.target.value)}
            className="job-search-input"
            autoComplete="off"
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

      <div className="job-filter-group job-filter-group--sort">
        <label htmlFor="job-filter-sort" className="job-filter-label">
          Sort by
        </label>
        <select
          id="job-filter-sort"
          value={sort}
          onChange={(e) => updateUrl({ sort: e.target.value })}
          className="job-filter-select"
        >
          {getSortOptions(t).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
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
            placeholder="e.g. 50000 (annual USD)"
            title="Annual salary in USD, no commas"
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
            placeholder="Optional max (annual USD)"
            title="Leave blank for no upper limit"
            value={salaryMax}
            onChange={(e) => updateUrl({ salaryMax: e.target.value || undefined })}
            className="job-filter-input"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <button type="button" onClick={clearFilters} className="job-filter-clear">
          <X size={14} />
          {t('clearAllFilters')}
        </button>
      )}
    </div>
  );

  return (
    <div className="job-board jobs-listing">
      {isAuthenticated && (loadingMatches || matchedJobs.length > 0) && (
        <section
          style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            background: 'var(--surface-container-low)',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Best matches for you</h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
                Ranked from your program, readiness, certifications, and activity.
              </p>
            </div>
            <a href="/dashboard/readiness" className="btn btn-outline" style={{ whiteSpace: 'nowrap' }}>
              Improve readiness
            </a>
          </div>

          {loadingMatches ? (
            <p style={{ margin: 0, color: 'var(--color-on-surface-variant)' }}>Loading matches…</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {matchedJobs.slice(0, 3).map((job) => (
                <Link
                  key={job.id}
                  href={`/dashboard/jobs/${job.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '0.875rem 1rem',
                    background: 'var(--surface-container)',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{job.title}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
                      {job.company} · {job.location}
                    </div>
                  </div>
                  <div
                    style={{
                      flexShrink: 0,
                      background: 'color-mix(in srgb, var(--color-teal, #0d9488) 12%, transparent)',
                      color: 'var(--color-teal, #0d9488)',
                      borderRadius: '999px',
                      padding: '0.35rem 0.65rem',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  >
                    {job.matchPct}% match
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
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
      </div>

      {/* Single filter panel — CSS in main.css promotes .job-filters-drawer
          to a static sidebar at md+ (always visible, drawer behavior
          ignored) and keeps it as a fixed drawer below md (controlled by
          .is-open). Closes audit #34: previously rendered twice in the
          DOM with duplicate input ids breaking <label htmlFor> a11y. */}
      <aside
        id="job-filters-drawer"
        className={`job-filters-drawer ${filtersOpen ? 'is-open' : ''}`}
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
      </aside>

      {loading ? (
        <div className="jobs-grid" aria-busy="true" aria-live="polite">
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        hasActiveFilters ? (
          <JobsEmptyState onClearFilters={clearFilters} t={t} />
        ) : (
          <JobsNoResultsState isAuthenticated={isAuthenticated} t={t} />
        )
      ) : (
        <>
          <p className="job-count">
            {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} found
          </p>
          <div className="jobs-grid">
            {jobs.map((j) => {
              const matched = matchedJobs.find((m) => m.id === j.id);
              return (
                <JobCard
                  key={j.id}
                  job={j}
                  isAuthenticated={isAuthenticated}
                  matchPct={matched?.matchPct}
                  isApplied={appliedSet.has(j.id)}
                  t={t}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
