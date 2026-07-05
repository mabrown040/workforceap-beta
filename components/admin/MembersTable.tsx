'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Filter, Plus, Download, Mail, Users, GraduationCap, CheckCircle } from 'lucide-react';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { getStudentStatus, type StudentStatus } from '@/lib/admin/studentStatus';
import BulkEmailModal from './BulkEmailModal';
import BulkUpdateModal from './BulkUpdateModal';
import { formatPhone } from '@/lib/formatPhone';
import type { HealthStatus } from '@/lib/admin/healthScore';
import DataTable from '@/components/portal/ui/DataTable';
import ConfirmDialog from './ConfirmDialog';
import PortalPagination from '@/components/portal/PortalPagination';

function formatMemberDate(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  const d = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}

type Member = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  profile: { profilePhone?: string | null; smsOptIn?: boolean } | null;
  enrolledProgram: string | null;
  enrolledAt: Date | string | null;
  createdAt: Date | string;
  staleTrainingDetectedAt: Date | string | null;
  assessmentScorePct: number | null;
  assessmentCompleted: boolean | null;
  updatedAt: Date | string;
  memberStatus: string | null;
  programTitle: string | null | undefined;
  coursesCompleted: string[];
  totalCourses: number;
  liveTraining: {
    percent: number;
    coursesCompleted: number;
    coursesActive: number;
    totalCourses: number;
    lastUpdatedAt: Date | string;
  } | null;
  partnerName: string | null;
  partnerId: string | null;
  fitScore?: number;
  healthStatus?: HealthStatus;
  enrollmentProgramSlugs: string[];
  enrollmentProgramTitleBySlug: Record<string, string>;
};

type MembersTableProps = {
  members: Member[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  searchQuery: string;
  programFilter: string;
  statusFilter: string;
  partnerFilter: string;
  startDateFilter: string;
  endDateFilter: string;
  /** Org-wide partner list so the dropdown is not limited to the loaded page. */
  allPartnerOptions: Array<{ id: string; name: string }>;
};

function FitScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? '#16a34a' : score >= 5 ? '#d97706' : '#dc2626';
  const bg = score >= 8 ? '#f0fdf4' : score >= 5 ? '#fffbeb' : '#fef2f2';
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 600, color, background: bg, border: `1px solid ${color}20`, fontVariantNumeric: 'tabular-nums' }}>{score}/10</span>;
}

function HealthDot({ status }: { status: HealthStatus }) {
  const variant = status === 'green' ? 'success' : status === 'yellow' ? 'warning' : 'error';
  const label = status === 'green' ? 'Active' : status === 'yellow' ? 'At Risk' : 'Inactive';
  return (
    <span style={{ display: 'inline-flex', marginRight: '0.35rem', verticalAlign: 'middle' }}>
      <StatusDot variant={variant} label={label} tooltip={label} />
    </span>
  );
}

function formatTraining(m: Member, variant: 'table' | 'card' = 'table'): string {
  if (m.liveTraining) {
    const active = m.liveTraining.coursesActive > 0
      ? ` · ${m.liveTraining.coursesActive} active`
      : '';
    if (variant === 'card') {
      return `${m.liveTraining.percent}% program${active}`;
    }
    return `${m.liveTraining.percent}% program · ${m.liveTraining.coursesCompleted}/${m.liveTraining.totalCourses} done${active}`;
  }
  if (m.assessmentCompleted) return `${m.coursesCompleted.length}/${m.totalCourses}`;
  return '—';
}

const NEW_MEMBER_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function toTime(value: Date | string | null | undefined): number {
  if (value == null) return 0;
  const d = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
  const t = d.getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** A member is "not in a course" when they have no enrolled program and no enrollment rows. */
function isNotInCourse(m: Member): boolean {
  return !m.enrolledProgram && m.enrollmentProgramSlugs.length === 0;
}

function isNewMember(m: Member): boolean {
  const t = toTime(m.createdAt);
  return t > 0 && Date.now() - t <= NEW_MEMBER_WINDOW_MS;
}

/**
 * "Needs attention" surfaces members dad should look at, derived from existing
 * row signals only: red health (at-risk/inactive) OR stale training detected OR
 * not enrolled in any course OR a brand-new signup. A sensible default he can refine.
 */
function attentionReasons(m: Member): string[] {
  const reasons: string[] = [];
  if (m.healthStatus === 'red') reasons.push('Inactive');
  if (m.staleTrainingDetectedAt) reasons.push('Stale training');
  if (isNotInCourse(m)) reasons.push('No course');
  if (isNewMember(m)) reasons.push('New');
  return reasons;
}

function needsAttention(m: Member): boolean {
  return attentionReasons(m).length > 0;
}

function AttentionBadge({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return <span style={{ color: '#9ca3af' }}>—</span>;
  const isNewOnly = reasons.length === 1 && reasons[0] === 'New';
  const color = isNewOnly ? '#2563eb' : '#dc2626';
  const bg = isNewOnly ? '#eff6ff' : '#fef2f2';
  return (
    <span
      title={reasons.join(' · ')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.15rem 0.5rem',
        borderRadius: '50px',
        fontSize: '0.72rem',
        fontWeight: 700,
        color,
        background: bg,
        border: `1px solid ${color}25`,
        whiteSpace: 'nowrap',
      }}
    >
      {reasons[0]}
      {reasons.length > 1 ? ` +${reasons.length - 1}` : ''}
    </span>
  );
}

type SortKey = 'name' | 'enrolled' | 'created' | 'fit' | 'health' | 'lastActive' | 'score';
type SortDir = 'asc' | 'desc';

const HEALTH_RANK: Record<string, number> = { red: 0, yellow: 1, green: 2 };

function compareMembers(a: Member, b: Member, key: SortKey): number {
  switch (key) {
    case 'name':
      return (a.fullName ?? '').localeCompare(b.fullName ?? '');
    case 'enrolled':
      return toTime(a.enrolledAt) - toTime(b.enrolledAt);
    case 'created':
      return toTime(a.createdAt) - toTime(b.createdAt);
    case 'fit':
      return (a.fitScore ?? -1) - (b.fitScore ?? -1);
    case 'health':
      return (HEALTH_RANK[a.healthStatus ?? ''] ?? 99) - (HEALTH_RANK[b.healthStatus ?? ''] ?? 99);
    case 'lastActive':
      return toTime(a.updatedAt) - toTime(b.updatedAt);
    case 'score':
      return (a.assessmentScorePct ?? -1) - (b.assessmentScorePct ?? -1);
    default:
      return 0;
  }
}

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="admin-members-sort-header"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        background: 'none',
        border: 'none',
        padding: 0,
        font: 'inherit',
        fontWeight: 'inherit',
        color: 'inherit',
        cursor: 'pointer',
      }}
      aria-label={`Sort by ${label}${active ? (dir === 'asc' ? ', ascending' : ', descending') : ''}`}
    >
      {label}
      <span style={{ fontSize: '0.7em', opacity: active ? 1 : 0.3 }}>
        {active ? (dir === 'asc' ? '▲' : '▼') : '▲'}
      </span>
    </button>
  );
}

function HeaderSelectAll({
  filtered,
  selectedIds,
  onBulkSelect,
}: {
  filtered: Member[];
  selectedIds: Set<string>;
  onBulkSelect: (selectAllInView: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const ids = filtered.map((m) => m.id);
  const selectedInView = ids.filter((id) => selectedIds.has(id)).length;
  const all = ids.length > 0 && selectedInView === ids.length;
  const some = selectedInView > 0 && !all;

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some;
  }, [some]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={all}
      onChange={() => onBulkSelect(!all)}
      aria-label={all ? 'Deselect all rows in current view' : 'Select all rows in current view'}
      className="admin-members-row-check"
    />
  );
}

export default function MembersTable({
  members,
  totalCount,
  currentPage,
  pageSize,
  searchQuery,
  programFilter,
  statusFilter,
  partnerFilter: partnerFilterProp,
  startDateFilter,
  endDateFilter,
  allPartnerOptions,
}: MembersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialSort = searchParams?.get('sort')?.split(':') as [SortKey, SortDir] | undefined;
  const [search, setSearch] = useState(searchQuery);
  const [programFilterState, setProgramFilterState] = useState(programFilter);
  const [statusFilterState, setStatusFilterState] = useState(statusFilter);
  const [partnerFilter, setPartnerFilter] = useState(partnerFilterProp);
  const [healthFilter, setHealthFilter] = useState(() => searchParams?.get('health') ?? '');
  const [notInCourseFilter, setNotInCourseFilter] = useState(false);
  const [needsAttentionFilter, setNeedsAttentionFilter] = useState(() => searchParams?.get('attention') === '1');
  const [startDate, setStartDate] = useState(startDateFilter);
  const [endDate, setEndDate] = useState(endDateFilter);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  // Dad-safe default: surface most-recently-active members first (matches server's initial sort).
  const [sortKey, setSortKey] = useState<SortKey>(() => initialSort?.[0] ?? 'lastActive');
  const [sortDir, setSortDir] = useState<SortDir>(() => initialSort?.[1] ?? 'desc');
  // "More sort options" disclosure starts collapsed; only the 3 common sorts show until expanded.
  const [showAdvancedSorts, setShowAdvancedSorts] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkHint, setBulkHint] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | { type: 'enrolled' | 'completed'; count: number }>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const searchDebounceRef = useRef<number | null>(null);

  const closeConfirmAction = () => {
    if (!bulkActionLoading) setConfirmAction(null);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const updateUrl = useCallback(
    (newParams: Record<string, string>) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      Object.entries(newParams).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      // Reset to page 1 when filters change
      if (
        newParams.search !== undefined ||
        newParams.program !== undefined ||
        newParams.status !== undefined ||
        newParams.partner !== undefined ||
        newParams.startDate !== undefined ||
        newParams.endDate !== undefined
      ) {
        params.delete('page');
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const filtered = useMemo(() => {
    const rows = members.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch = !search || m.fullName?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
      const matchProgram = !programFilterState || m.enrollmentProgramSlugs.includes(programFilterState);
      const memberStatus = getStudentStatus({
        enrolledAt: m.enrolledAt ? new Date(m.enrolledAt) : null,
        enrolledProgram: m.enrolledProgram,
        deletedAt: null, // client-side only sees non-deleted from server
        updatedAt: typeof m.updatedAt === 'string' ? new Date(m.updatedAt) : m.updatedAt,
        courseProgressCount: m.liveTraining?.percent ?? 0,
        certificationCount: m.coursesCompleted?.length ?? 0,
        recentEventCount: m.healthStatus === 'green' ? 1 : 0,
      });
      const matchStatus = !statusFilterState || (
        statusFilterState === 'stale'
          ? !!m.staleTrainingDetectedAt
          : memberStatus === statusFilterState
      );
      // Partner and date-range filters round-trip to the server (URL params),
      // so the loaded page is already scoped to them — no client predicate.
      const matchHealth = !healthFilter || m.healthStatus === healthFilter;
      const matchNotInCourse = !notInCourseFilter || isNotInCourse(m);
      const matchAttention = !needsAttentionFilter || needsAttention(m);
      return matchSearch && matchProgram && matchStatus && matchHealth && matchNotInCourse && matchAttention;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    // Stable sort with a fit-score tiebreaker so equal keys keep a sensible order.
    return rows
      .map((m, i) => [m, i] as const)
      .sort(([a, ia], [b, ib]) => {
        const primary = compareMembers(a, b, sortKey) * dir;
        if (primary !== 0) return primary;
        const tie = (b.fitScore ?? -1) - (a.fitScore ?? -1);
        return tie !== 0 ? tie : ia - ib;
      })
      .map(([m]) => m);
  }, [
    members,
    search,
    programFilterState,
    statusFilterState,
    healthFilter,
    notInCourseFilter,
    needsAttentionFilter,
    sortKey,
    sortDir,
  ]);

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Names default ascending (A→Z); numeric/date columns default descending (newest/highest first).
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  }

  const programs = useMemo(() => {
    const titleBySlug = new Map<string, string>();
    for (const m of members) {
      for (const slug of m.enrollmentProgramSlugs) {
        if (!titleBySlug.has(slug)) {
          titleBySlug.set(slug, m.enrollmentProgramTitleBySlug[slug] ?? slug);
        }
      }
    }
    return [...titleBySlug.entries()]
      .map(([slug, title]) => ({ slug, title }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [members]);

  const partnerOptions = useMemo(
    () => allPartnerOptions.map((p) => [p.id, p.name] as const),
    [allPartnerOptions],
  );

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (programFilterState ? 1 : 0) +
    (statusFilterState ? 1 : 0) +
    (partnerFilter ? 1 : 0) +
    (healthFilter ? 1 : 0) +
    (notInCourseFilter ? 1 : 0) +
    (needsAttentionFilter ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0);

  const selectedInCurrentView = useMemo(
    () => filtered.filter((m) => selectedIds.has(m.id)).length,
    [filtered, selectedIds],
  );

  const selectedRows = useMemo(() => members.filter((m) => selectedIds.has(m.id)), [members, selectedIds]);

  function clearAllFilters() {
    setSearch('');
    setProgramFilterState('');
    setStatusFilterState('');
    setPartnerFilter('');
    setHealthFilter('');
    setNotInCourseFilter(false);
    setNeedsAttentionFilter(false);
    setStartDate('');
    setEndDate('');
    updateUrl({ search: '', program: '', status: '', partner: '', startDate: '', endDate: '', health: '', attention: '', page: '' });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setBulkHint(null);
  }

  function onHeaderSelect(selectAllInView: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const ids = filtered.map((m) => m.id);
      if (selectAllInView) {
        for (const id of ids) next.add(id);
      } else {
        for (const id of ids) next.delete(id);
      }
      return next;
    });
    setBulkHint(null);
  }

  function copySelectedEmails() {
    const text = selectedRows.map((m) => m.email).join('\n');
    void navigator.clipboard.writeText(text).then(() => {
      setBulkHint(`Copied ${selectedRows.length} email${selectedRows.length === 1 ? '' : 's'}`);
      window.setTimeout(() => setBulkHint(null), 3500);
    });
  }

  async function downloadSelectedCsv() {
    if (selectedRows.length === 0) return;
    try {
      const res = await fetch('/api/admin/members/bulk-export', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberIds: selectedRows.map((m) => m.id) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setBulkHint(typeof data.error === 'string' ? data.error : 'Export failed');
        window.setTimeout(() => setBulkHint(null), 3500);
        return;
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      a.download = `members-export-${selectedRows.length}-${date}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      setBulkHint(`Exported ${selectedRows.length} row${selectedRows.length === 1 ? '' : 's'}`);
      window.setTimeout(() => setBulkHint(null), 3500);
    } catch {
      setBulkHint('Network error during export');
      window.setTimeout(() => setBulkHint(null), 3500);
    }
  }

  async function exportFilteredCsv() {
    if (filtered.length === 0) return;
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (programFilterState) params.set('program', programFilterState);
      if (partnerFilter) params.set('partner', partnerFilter);
      if (healthFilter) params.set('health', healthFilter);
      if (notInCourseFilter) params.set('notInCourse', '1');
      if (needsAttentionFilter) params.set('needsAttention', '1');
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/admin/members/export?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setBulkHint(typeof data.error === 'string' ? data.error : 'Export failed');
        window.setTimeout(() => setBulkHint(null), 3500);
        return;
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      a.download = `students-export-${date}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      setBulkHint('Exported all members matching your filters');
      window.setTimeout(() => setBulkHint(null), 3500);
    } catch {
      setBulkHint('Network error during export');
      window.setTimeout(() => setBulkHint(null), 3500);
    } finally {
      setExportLoading(false);
    }
  }

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return;
    updateUrl({ page: page.toString() });
  }

  return (
    <div className="admin-members-table-root">
      <div className="admin-members-toolbar">
        <div className="admin-members-toolbar__primary">
          <label className="admin-members-search-label">
            <span className="admin-members-search-label__text">Search members</span>
            <input
              type="search"
              placeholder="Name or email"
              value={search}
              onChange={(e) => {
                const value = e.target.value;
                setSearch(value);
                if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
                searchDebounceRef.current = window.setTimeout(() => updateUrl({ search: value }), 300);
              }}
              className="admin-members-search-input"
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            className="btn btn-outline btn-sm md:wa-hidden admin-members-filter-toggle"
            onClick={() => setFiltersExpanded((v) => !v)}
            aria-expanded={filtersExpanded}
          >
            <Filter size={14} aria-hidden style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
            Refine list
            {activeFilterCount > 0 ? <span className="admin-members-filter-badge">{activeFilterCount}</span> : null}
          </button>
        </div>

        <div className="admin-members-count-line" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span aria-live="polite">
            <strong>{filtered.length.toLocaleString()}</strong> shown
            {totalCount !== filtered.length ? (
              <>
                {' '}
                of <strong>{totalCount.toLocaleString()}</strong>
              </>
            ) : null}
            {activeFilterCount > 0 ? <span className="admin-members-count-line__filters"> · {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} on</span> : null}
            {totalPages > 1 && (healthFilter || notInCourseFilter || needsAttentionFilter) ? (
              <span className="admin-members-count-line__filters" style={{ display: 'block', fontSize: '0.78rem' }}>
                Health / attention filters apply to this page&apos;s {members.length} members only — page through to check the rest, or Export CSV (applies them to all matching members).
              </span>
            ) : null}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <label className="admin-members-filter-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); updateUrl({ startDate: e.target.value }); }}
                className="admin-members-filter-select"
                style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem' }}
              />
            </label>
            <label className="admin-members-filter-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); updateUrl({ endDate: e.target.value }); }}
                className="admin-members-filter-select"
                style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem' }}
              />
            </label>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => void exportFilteredCsv()}
              disabled={exportLoading || filtered.length === 0}
              aria-busy={exportLoading}
            >
              <Download size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
              {exportLoading ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        </div>

        <div
          className={['admin-members-filters', filtersExpanded ? 'admin-members-filters--open' : ''].filter(Boolean).join(' ')}
        >
          <label className="admin-members-filter-field">
            <span>Program</span>
            <select
              value={programFilterState}
              onChange={(e) => {
                setProgramFilterState(e.target.value);
                updateUrl({ program: e.target.value });
              }}
              className="admin-members-filter-select"
            >
              <option value="">All programs</option>
              {programs.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-members-filter-field">
            <span>Status</span>
            <select
              value={statusFilterState}
              onChange={(e) => {
                setStatusFilterState(e.target.value);
                updateUrl({ status: e.target.value });
              }}
              className="admin-members-filter-select"
            >
              <option value="">All statuses</option>
              <option value="enrolled">Enrolled (in program)</option>
              <option value="active">Active (recent activity)</option>
              <option value="completed">Completed (certified)</option>
              <option value="dropped">Dropped (deleted)</option>
              <option value="stale">Stale training (7d+)</option>
            </select>
          </label>
          <label className="admin-members-filter-field">
            <span>Partner</span>
            <select value={partnerFilter} onChange={(e) => { setPartnerFilter(e.target.value); updateUrl({ partner: e.target.value }); }} className="admin-members-filter-select">
              <option value="">All partners</option>
              <option value="__none">No partner</option>
              {partnerOptions.map(([pid, pname]) => (
                <option key={pid} value={pid}>
                  {pname}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-members-filter-field">
            <span>Health</span>
            <select value={healthFilter} onChange={(e) => setHealthFilter(e.target.value)} className="admin-members-filter-select">
              <option value="">All health</option>
              <option value="green">Active</option>
              <option value="yellow">At Risk</option>
              <option value="red">Inactive</option>
            </select>
          </label>
          <label className="admin-members-filter-field admin-members-filter-field--check" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="checkbox"
              checked={needsAttentionFilter}
              onChange={(e) => setNeedsAttentionFilter(e.target.checked)}
            />
            <span>Needs attention</span>
          </label>
          <label className="admin-members-filter-field admin-members-filter-field--check" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="checkbox"
              checked={notInCourseFilter}
              onChange={(e) => setNotInCourseFilter(e.target.checked)}
            />
            <span>Not in a course</span>
          </label>
          <label className="admin-members-filter-field">
            <span>Sort by</span>
            {(() => {
              // Dad-safe surface: 3 common sorts always visible; remaining 6 behind a
              // "More sort options" disclosure. If the user's current sort is one of the
              // advanced 6, auto-expand so the dropdown reflects the active selection.
              const currentValue = `${sortKey}:${sortDir}`;
              const commonValues = new Set(['lastActive:desc', 'name:asc', 'created:desc']);
              const expanded = showAdvancedSorts || !commonValues.has(currentValue);
              return (
                <>
                  <select
                    value={currentValue}
                    onChange={(e) => {
                      const [k, d] = e.target.value.split(':') as [SortKey, SortDir];
                      setSortKey(k);
                      setSortDir(d);
                    }}
                    className="admin-members-filter-select"
                  >
                    {expanded ? (
                      <>
                        <optgroup label="Common">
                          <option value="lastActive:desc">Recently active</option>
                          <option value="name:asc">Name (A→Z)</option>
                          <option value="created:desc">Recently signed up</option>
                        </optgroup>
                        <optgroup label="Advanced">
                          <option value="fit:desc">Best fit first</option>
                          <option value="created:asc">Oldest first</option>
                          <option value="enrolled:desc">Recently enrolled</option>
                          <option value="lastActive:asc">Least recently active</option>
                          <option value="health:asc">Health (worst first)</option>
                          <option value="score:desc">Highest assessment %</option>
                        </optgroup>
                      </>
                    ) : (
                      <>
                        <option value="lastActive:desc">Recently active</option>
                        <option value="name:asc">Name (A→Z)</option>
                        <option value="created:desc">Recently signed up</option>
                      </>
                    )}
                  </select>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowAdvancedSorts((v) => !v)}
                    aria-expanded={expanded}
                    style={{ marginTop: '0.25rem', alignSelf: 'flex-start', fontSize: '0.78rem', padding: '0.15rem 0.4rem' }}
                  >
                    {expanded ? 'Fewer sort options ▴' : 'More sort options ▾'}
                  </button>
                </>
              );
            })()}
          </label>
          {activeFilterCount > 0 ? (
            <div className="admin-members-filter-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearAllFilters}>
                Clear all filters
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {selectedIds.size >= 1 && (
        <div className="admin-members-bulk-bar" role="region" aria-label="Bulk actions for selected members">
          <div className="admin-members-bulk-bar__lead">
            <span className="admin-members-bulk-bar__count">{selectedIds.size}</span>
            <span>
              selected
              {selectedInCurrentView < selectedIds.size ? (
                <span className="admin-members-bulk-bar__sub"> ({selectedInCurrentView} in current view)</span>
              ) : null}
            </span>
          </div>
          <div className="admin-members-bulk-bar__actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onHeaderSelect(true)} disabled={filtered.length === 0}>
              Select all in view
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSelectedIds(new Set()); setBulkHint(null); }}>
              Clear selection
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void copySelectedEmails()}>
              Copy emails
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => void downloadSelectedCsv()}>
              <Download size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
              Export CSV
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowEmailModal(true)}>
              <Mail size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
              Bulk email
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowUpdateModal(true)}>
              <Users size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
              Bulk update
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setConfirmAction({ type: 'enrolled', count: selectedIds.size })}
              disabled={bulkActionLoading}
            >
              <GraduationCap size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
              Mark as Enrolled
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setConfirmAction({ type: 'completed', count: selectedIds.size })}
              disabled={bulkActionLoading}
            >
              <CheckCircle size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
              Mark as Completed
            </button>
          </div>
          {bulkHint ? <p className="admin-members-bulk-hint">{bulkHint}</p> : null}
        </div>
      )}

      <div className="admin-table-scroll admin-members-desktop">
        <DataTable
          variant="admin"
          tableClassName="admin-table admin-table--dense"
          scrollX={false}
          rows={filtered}
          rowKey={(m) => m.id}
          getRowProps={(m) => ({
            onClick: () => router.push(`/admin/members/${m.id}`),
            style: { cursor: 'pointer' },
            'data-clickable': 'true',
          })}
          columns={[
            {
              key: 'sel',
              header: <HeaderSelectAll filtered={filtered} selectedIds={selectedIds} onBulkSelect={onHeaderSelect} />,
              width: 40,
              align: 'center',
              columnClassName: 'admin-members-col-select',
              cell: (m) => (
                <span
                  role="presentation"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(m.id)}
                    onChange={() => toggleSelect(m.id)}
                    aria-label={`Select ${m.fullName}`}
                    className="admin-members-row-check"
                  />
                </span>
              ),
            },
            {
              key: 'attn',
              header: 'Priority',
              cell: (m) => <AttentionBadge reasons={attentionReasons(m)} />,
            },
            {
              key: 'memberStatus',
              header: 'Status',
              cell: (m) => {
                const status = m.memberStatus ?? 'active';
                const color = status === 'active' ? '#16a34a' : status === 'placed' ? '#2563eb' : '#9ca3af';
                const bg = status === 'active' ? '#f0fdf4' : status === 'placed' ? '#eff6ff' : '#f3f4f6';
                return (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 600, color, background: bg, border: `1px solid ${color}20`, textTransform: 'capitalize' }}>
                    {status}
                  </span>
                );
              },
            },
            {
              key: 'name',
              header: (
                <SortHeader label="Name" sortKey="name" active={sortKey === 'name'} dir={sortDir} onSort={onSort} />
              ),
              cell: (m) => {
                const rawPhone = m.profile?.profilePhone ?? m.phone;
                const phoneDisplay = formatPhone(rawPhone);
                const lastActive = formatMemberDate(m.updatedAt) ?? '—';
                return (
                  <>
                    <Link href={`/admin/members/${m.id}`} onClick={(e) => e.stopPropagation()}>
                      {m.healthStatus && <HealthDot status={m.healthStatus} />}
                      {m.fullName}
                    </Link>
                    <div className="members-name-details">
                      {rawPhone ? (
                        <>
                          <span>{phoneDisplay}</span>
                          <span className="members-name-details-sep"> · </span>
                        </>
                      ) : null}
                      <span>Last active {lastActive}</span>
                    </div>
                  </>
                );
              },
            },
            { key: 'email', header: 'Email', cell: (m) => m.email },
            {
              key: 'phone',
              header: 'Phone',
              columnClassName: 'members-col-md',
              cell: (m) => (
                <span title={m.profile?.smsOptIn ? 'SMS opted in' : 'SMS not opted in'}>
                  {formatPhone(m.profile?.profilePhone ?? m.phone)}
                  {m.profile?.smsOptIn && <span style={{ marginLeft: 4, fontSize: '0.75rem', color: '#16a34a' }}>✓ SMS</span>}
                </span>
              ),
            },
            { key: 'program', header: 'Program', cell: (m) => m.programTitle ?? '—' },
            { key: 'partner', header: 'Partner', cell: (m) => m.partnerName ?? '—' },
            {
              key: 'fit',
              header: <SortHeader label="Fit" sortKey="fit" active={sortKey === 'fit'} dir={sortDir} onSort={onSort} />,
              align: 'right',
              cell: (m) => (m.fitScore != null ? <FitScoreBadge score={m.fitScore} /> : '—'),
            },
            {
              key: 'health',
              header: (
                <SortHeader label="Health" sortKey="health" active={sortKey === 'health'} dir={sortDir} onSort={onSort} />
              ),
              cell: (m) =>
                m.healthStatus ? (
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color:
                        m.healthStatus === 'green' ? '#16a34a' : m.healthStatus === 'yellow' ? '#d97706' : '#dc2626',
                    }}
                  >
                    {m.healthStatus === 'green' ? 'Active' : m.healthStatus === 'yellow' ? 'At Risk' : 'Inactive'}
                  </span>
                ) : (
                  '—'
                ),
            },
            {
              key: 'enrolled',
              header: (
                <SortHeader label="Enrolled" sortKey="enrolled" active={sortKey === 'enrolled'} dir={sortDir} onSort={onSort} />
              ),
              cell: (m) => formatMemberDate(m.enrolledAt) ?? '—',
            },
            {
              key: 'score',
              header: (
                <SortHeader label="Score %" sortKey="score" active={sortKey === 'score'} dir={sortDir} onSort={onSort} />
              ),
              align: 'right',
              cell: (m) => (
                <span
                  className={
                    m.assessmentScorePct != null
                      ? m.assessmentScorePct >= 70
                        ? 'admin-score-high'
                        : m.assessmentScorePct >= 50
                          ? 'admin-score-mid'
                          : 'admin-score-low'
                      : ''
                  }
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {m.assessmentScorePct != null ? `${m.assessmentScorePct}%` : '—'}
                </span>
              ),
            },
            { key: 'training', header: 'Training', cell: (m) => formatTraining(m) },
            {
              key: 'lastMd',
              header: (
                <SortHeader label="Last Active" sortKey="lastActive" active={sortKey === 'lastActive'} dir={sortDir} onSort={onSort} />
              ),
              columnClassName: 'members-col-md',
              cell: (m) => formatMemberDate(m.updatedAt) ?? '—',
            },
            {
              key: 'session',
              header: 'Session',
              cell: (m) => (
                <Link
                  href={`/counselor/sessions/${m.id}/run`}
                  onClick={(e) => e.stopPropagation()}
                  className="btn btn-sm btn-outline"
                  style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                >
                  Start session
                </Link>
              ),
            },
          ]}
        />
      </div>

      <ul className="admin-portal-card-list admin-members-cards" aria-label="Members (mobile layout)">
        {filtered.map((m) => {
          const rawPhone = m.profile?.profilePhone ?? m.phone;
          const phoneDisplay = formatPhone(rawPhone);
          const lastActive = formatMemberDate(m.updatedAt) ?? '—';
          return (
            <li
              key={m.id}
              className="admin-portal-card"
              style={{ cursor: 'pointer' }}
              onClick={() => window.location.assign(`/admin/members/${m.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') window.location.assign(`/admin/members/${m.id}`);
              }}
              aria-label={`View details for ${m.fullName}`}
            >
              <div className="admin-portal-card__header" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1, minWidth: 0 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(m.id)}
                    onChange={() => toggleSelect(m.id)}
                    aria-label={`Select ${m.fullName}`}
                  />
                  <Link href={`/admin/members/${m.id}`} style={{ fontWeight: 700, color: 'var(--color-accent)', wordBreak: 'break-word' }} onClick={(e) => e.stopPropagation()}>
                    {m.healthStatus && <HealthDot status={m.healthStatus} />}
                    {m.fullName}
                  </Link>
                </label>
                {m.healthStatus ? (
                  <span
                    className="admin-portal-card__badge"
                    style={{
                      background:
                        m.healthStatus === 'green'
                          ? 'rgba(22,163,74,0.12)'
                          : m.healthStatus === 'yellow'
                            ? 'rgba(217,119,6,0.12)'
                            : 'rgba(220,38,38,0.12)',
                      color: m.healthStatus === 'green' ? '#166534' : m.healthStatus === 'yellow' ? '#b45309' : '#991b1b',
                    }}
                  >
                    {m.healthStatus === 'green' ? 'Active' : m.healthStatus === 'yellow' ? 'At Risk' : 'Inactive'}
                  </span>
                ) : null}
              </div>
              {attentionReasons(m).length > 0 ? (
                <p className="admin-portal-card__row" onClick={(e) => e.stopPropagation()}>
                  <span className="admin-portal-card__label">Priority</span> <AttentionBadge reasons={attentionReasons(m)} />
                </p>
              ) : null}
              <p className="admin-portal-card__row">
                <span className="admin-portal-card__label">Status</span>{' '}
                {(() => {
                  const status = m.memberStatus ?? 'active';
                  const color = status === 'active' ? '#16a34a' : status === 'placed' ? '#2563eb' : '#9ca3af';
                  const bg = status === 'active' ? '#f0fdf4' : status === 'placed' ? '#eff6ff' : '#f3f4f6';
                  return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 600, color, background: bg, border: `1px solid ${color}20`, textTransform: 'capitalize' }}>
                      {status}
                    </span>
                  );
                })()}
              </p>
              <p className="admin-portal-card__meta">{m.email}</p>
              {rawPhone ? <p className="admin-portal-card__meta">{phoneDisplay}</p> : null}
              <p className="admin-portal-card__row">
                <span className="admin-portal-card__label">Program</span> {m.programTitle ?? '—'}
              </p>
              <p className="admin-portal-card__row">
                <span className="admin-portal-card__label">Partner</span> {m.partnerName ?? '—'}
              </p>
              <p className="admin-portal-card__row">
                <span className="admin-portal-card__label">Fit</span> {m.fitScore != null ? <FitScoreBadge score={m.fitScore} /> : '—'}
              </p>
              <p className="admin-portal-card__row">
                <span className="admin-portal-card__label">Training</span> {formatTraining(m, 'card')}
              </p>
              <p className="admin-portal-card__meta">Last active {lastActive}</p>
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                <Link
                  href={`/counselor/sessions/${m.id}/run`}
                  onClick={(e) => e.stopPropagation()}
                  className="btn btn-sm btn-outline"
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  Start session
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 && (
        <div className="admin-empty-state">
          <h3>{members.length === 0 ? 'No members yet' : 'No matches'}</h3>
          <p>{members.length === 0 ? 'Add your first member to get started.' : 'Try adjusting your search or filters.'}</p>
          {members.length === 0 && (
            <a href="/admin/members/new" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Plus size={16} /> Add Member
            </a>
          )}
        </div>
      )}

      <PortalPagination
        page={currentPage}
        totalPages={totalPages}
        onChange={goToPage}
        label="Members pagination"
      />

      <BulkEmailModal
        open={showEmailModal}
        memberIds={selectedRows.map((m) => m.id)}
        onClose={() => setShowEmailModal(false)}
        onSent={(result) => {
          const ok = result.sent + result.messagesCreated;
          const hint = `Sent to ${ok}/${result.total} members${result.errors.length > 0 ? ` (${result.errors.length} failed)` : ''}`;
          setBulkHint(hint);
          window.setTimeout(() => setBulkHint(null), 5000);
        }}
      />

      <BulkUpdateModal
        open={showUpdateModal}
        memberIds={selectedRows.map((m) => m.id)}
        programs={programs}
        onClose={() => setShowUpdateModal(false)}
        onUpdated={(result) => {
          const hint = `Updated ${result.updated}/${result.total} members${result.errors.length > 0 ? ` (${result.errors.length} failed)` : ''}`;
          setBulkHint(hint);
          window.setTimeout(() => setBulkHint(null), 5000);
          setSelectedIds(new Set());
          router.refresh();
        }}
      />

      {/* Confirmation dialog for quick bulk actions — shared pattern, see ConfirmDialog.tsx */}
      <ConfirmDialog
        open={!!confirmAction}
        title="Confirm bulk action"
        body={
          confirmAction ? (
            <>
              You are about to mark <strong>{confirmAction.count}</strong> member{confirmAction.count === 1 ? '' : 's'} as{' '}
              <strong>{confirmAction.type === 'enrolled' ? 'Enrolled' : 'Completed'}</strong>.
              This will update their pipeline stage.
            </>
          ) : (
            ''
          )
        }
        confirmLabel={bulkActionLoading ? 'Applying…' : 'Confirm'}
        busy={bulkActionLoading}
        onCancel={closeConfirmAction}
        onConfirm={async () => {
          if (!confirmAction) return;
          setBulkActionLoading(true);
          try {
            const res = await fetch('/api/admin/members/bulk-update', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                memberIds: selectedRows.map((m) => m.id),
                pipelineStage: confirmAction.type === 'enrolled' ? 'enrolled' : 'certified',
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              setBulkHint(typeof data.error === 'string' ? data.error : 'Bulk action failed');
              window.setTimeout(() => setBulkHint(null), 5000);
              return;
            }
            const hint = `${confirmAction.type === 'enrolled' ? 'Marked as enrolled' : 'Marked as completed'}: ${data.updated}/${data.total} members${data.errors.length > 0 ? ` (${data.errors.length} failed)` : ''}`;
            setBulkHint(hint);
            window.setTimeout(() => setBulkHint(null), 5000);
            setSelectedIds(new Set());
            router.refresh();
          } catch {
            setBulkHint('Network error during bulk action');
            window.setTimeout(() => setBulkHint(null), 5000);
          } finally {
            setBulkActionLoading(false);
            setConfirmAction(null);
          }
        }}
      />
    </div>
  );
}
