'use client';

import Link from 'next/link';
import { useMemo, useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import type { BadgeVariant } from '@/components/portal/StatusBadge';
import { DataTable, StatusTag, Avatar, ProgressBar, type Column, type KitTone } from '@/components/portal/kit';
import { counselorStudentStatusBadge, counselorStudentStatusBadgeVariant } from '@/lib/counselor/memberStatus';
import { computeTrainingProgress, type LiveTrainingProgressSummary } from '@/lib/member/trainingProgress';

/** Must match `THRESHOLDS.MEDIUM` in `lib/member/atRiskScoring.ts` (avoid importing prisma in client). */
const RISK_MEDIUM_OR_ABOVE = 30;

type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type CounselorRosterClientRow = {
  assignmentId: string;
  memberId: string;
  fullName: string | null;
  email: string;
  enrolledProgram: string | null;
  programInterest: string | null;
  assessmentScorePct: number | null;
  wioaReviewStatus: string | null;
  memberProgramProgress: LiveTrainingProgressSummary[];
  riskScore: number | null;
  riskLevel: RiskLevel;
  lastActivityAt: string;
};

export type CounselorRosterFilterMeta = {
  memberId: string;
  atRisk: boolean;
  upcomingSession: boolean;
  pendingApplication: boolean;
};

type FilterKey = 'at-risk' | 'upcoming-session' | 'pending-application' | null;

const FILTER_CHIPS: { key: Exclude<FilterKey, null>; label: string; accent: string; accentBg: string }[] = [
  { key: 'at-risk', label: 'At Risk', accent: '#b91c1c', accentBg: 'color-mix(in srgb, #dc2626 14%, transparent)' },
  { key: 'upcoming-session', label: 'Upcoming Session', accent: 'var(--color-accent)', accentBg: 'color-mix(in srgb, var(--color-accent) 14%, transparent)' },
  { key: 'pending-application', label: 'Pending Application', accent: 'var(--color-gold)', accentBg: 'color-mix(in srgb, var(--color-gold) 14%, transparent)' },
];

const RISK_BADGE_META: Record<'CRITICAL' | 'HIGH' | 'MEDIUM', { label: string; tone: KitTone }> = {
  CRITICAL: { label: 'Critical', tone: 'alert' },
  HIGH: { label: 'High', tone: 'alert' },
  MEDIUM: { label: 'Medium', tone: 'warn' },
};

/** Map the legacy StatusBadge BadgeVariant to the kit's 5-value tone enum. */
function badgeVariantToTone(variant: BadgeVariant): KitTone {
  switch (variant) {
    case 'success':
      return 'ok';
    case 'warning':
      return 'warn';
    case 'error':
      return 'alert';
    case 'info':
      return 'info';
    case 'accent':
      return 'info';
    case 'neutral':
    default:
      return 'muted';
  }
}

function formatLastActivity(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return 'Just now';
  const diffM = Math.floor(diffMs / (60 * 1000));
  if (diffM < 60) return diffM <= 1 ? 'Just now' : `${diffM}m ago`;
  const diffH = Math.floor(diffMs / (60 * 60 * 1000));
  if (diffH < 48) return `${diffH}h ago`;
  const diffD = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return `${diffD}d ago`;
}

function CounselorRosterRiskBadge({ level }: { level: RiskLevel }) {
  if (level === 'LOW') return null;
  const s = RISK_BADGE_META[level];
  return (
    <span title={`Risk: ${s.label}`} style={{ display: 'inline-flex', flexShrink: 0 }}>
      <StatusTag tone={s.tone}>{s.label}</StatusTag>
    </span>
  );
}

function wioaBadgeProps(status: string | null | undefined): { label: string; variant: 'info' | 'success' | 'error' | 'neutral'; tooltip: string } {
  switch (status) {
    case 'verified':
      return { label: 'WIOA Verified', variant: 'success', tooltip: 'Member is WIOA-verified and eligible to enroll in training' };
    case 'pending':
    case 'in_review':
      return { label: 'WIOA Pending', variant: 'info', tooltip: 'Member submitted WIOA screening — awaiting counselor review' };
    case 'not_eligible':
    case 'needs_info':
      return { label: 'Not Eligible', variant: 'error', tooltip: 'Member is not eligible for training enrollment until WorkforceAP resolves their WIOA status' };
    default:
      return { label: 'WIOA: Not Started', variant: 'info', tooltip: "Member hasn't submitted WIOA screening" };
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

type Props = {
  rows: CounselorRosterClientRow[];
  filterMeta: CounselorRosterFilterMeta[];
  initialFilter?: string;
};

export default function CounselorStudentsRosterClient({ rows, filterMeta, initialFilter }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [atRiskOnly, setAtRiskOnly] = useState(false);

  const activeFilter: FilterKey = useMemo(() => {
    const param = searchParams?.get('filter') ?? initialFilter ?? '';
    if (param === 'at-risk') return 'at-risk';
    if (param === 'upcoming-session') return 'upcoming-session';
    if (param === 'pending-application') return 'pending-application';
    return null;
  }, [searchParams, initialFilter]);

  const updateFilter = useCallback(
    (next: FilterKey) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (next) {
        params.set('filter', next);
      } else {
        params.delete('filter');
      }
      const qs = params.toString();
      if (pathname) router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const metaByMember = useMemo(() => {
    const map = new Map<string, CounselorRosterFilterMeta>();
    for (const m of filterMeta) map.set(m.memberId, m);
    return map;
  }, [filterMeta]);

  const visible = useMemo(() => {
    if (activeFilter === 'at-risk') {
      return rows.filter((r) => r.riskScore != null && r.riskScore >= RISK_MEDIUM_OR_ABOVE);
    }
    if (activeFilter === 'upcoming-session') {
      return rows.filter((r) => metaByMember.get(r.memberId)?.upcomingSession);
    }
    if (activeFilter === 'pending-application') {
      return rows.filter((r) => metaByMember.get(r.memberId)?.pendingApplication);
    }
    if (atRiskOnly) {
      return rows.filter((r) => r.riskScore != null && r.riskScore >= RISK_MEDIUM_OR_ABOVE);
    }
    return rows;
  }, [rows, activeFilter, atRiskOnly, metaByMember]);

  const filterChips = (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        padding: '0 1rem',
        marginBottom: '0.75rem',
      }}
      className="md:wa-hidden"
    >
      {FILTER_CHIPS.map((chip) => {
        const isActive = activeFilter === chip.key;
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => updateFilter(isActive ? null : chip.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 700,
              border: `1px solid ${isActive ? chip.accent : 'var(--outline-variant)'}`,
              background: isActive ? chip.accentBg : 'var(--surface-container-high)',
              color: isActive ? chip.accent : 'var(--color-on-surface-variant)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {chip.label}
            {isActive && (
              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>✕</span>
            )}
          </button>
        );
      })}
      {activeFilter && (
        <button
          type="button"
          onClick={() => updateFilter(null)}
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            border: '1px solid var(--outline-variant)',
            background: 'transparent',
            color: 'var(--color-on-surface-variant)',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      )}
    </div>
  );

  const filterChipsDesktop = (
    <div
      className="wa-hidden md:wa-flex"
      style={{ flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}
    >
      {FILTER_CHIPS.map((chip) => {
        const isActive = activeFilter === chip.key;
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => updateFilter(isActive ? null : chip.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: 700,
              border: `1px solid ${isActive ? chip.accent : 'var(--outline-variant)'}`,
              background: isActive ? chip.accentBg : 'var(--surface-container-high)',
              color: isActive ? chip.accent : 'var(--color-on-surface-variant)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {chip.label}
            {isActive && (
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>✕</span>
            )}
          </button>
        );
      })}
      {activeFilter && (
        <button
          type="button"
          onClick={() => updateFilter(null)}
          style={{
            padding: '0.45rem 0.7rem',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 600,
            border: '1px solid var(--outline-variant)',
            background: 'transparent',
            color: 'var(--color-on-surface-variant)',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      )}
    </div>
  );

  const toggle = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0 1rem',
        marginBottom: '0.75rem',
      }}
      className="md:wa-hidden"
    >
      <button
        type="button"
        role="switch"
        aria-checked={atRiskOnly}
        onClick={() => setAtRiskOnly((v) => !v)}
        style={{
          position: 'relative',
          width: 44,
          height: 26,
          borderRadius: 999,
          border: '1px solid var(--outline-variant)',
          background: atRiskOnly ? 'var(--color-accent)' : 'var(--surface-container-high)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: atRiskOnly ? 22 : 3,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
            transition: 'left 0.15s ease',
          }}
        />
      </button>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>At-risk only</span>
      <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>(score ≥ medium)</span>
    </div>
  );

  const toggleDesktop = (
    <div
      className="wa-hidden md:wa-flex"
      style={{ alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={atRiskOnly}
        onClick={() => setAtRiskOnly((v) => !v)}
        style={{
          position: 'relative',
          width: 44,
          height: 26,
          borderRadius: 999,
          border: '1px solid var(--outline-variant)',
          background: atRiskOnly ? 'var(--color-accent)' : 'var(--surface-container-high)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: atRiskOnly ? 22 : 3,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
            transition: 'left 0.15s ease',
          }}
        />
      </button>
      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>At-risk only</span>
      <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>Members with risk score ≥ medium (from nightly alert)</span>
    </div>
  );

  if (rows.length === 0) return null;

  const emptyFiltered = visible.length === 0 && (activeFilter != null || atRiskOnly);

  const emptyTitle =
    activeFilter === 'at-risk'
      ? 'No at-risk members in your roster'
      : activeFilter === 'upcoming-session'
        ? 'No upcoming sessions in the next 7 days'
        : activeFilter === 'pending-application'
          ? 'No members with pending applications'
          : 'No at-risk members in your roster';

  const emptyDescription =
    activeFilter === 'at-risk'
      ? 'Everyone is below the medium risk threshold, or alerts have not run yet.'
      : activeFilter === 'upcoming-session'
        ? 'No members have mentor sessions scheduled in the next 7 days.'
        : activeFilter === 'pending-application'
          ? 'All assigned members have completed or had their applications reviewed.'
          : 'Everyone is below the medium risk threshold, or alerts have not run yet.';

  const desktopColumns: Column<CounselorRosterClientRow>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (a) => {
        const program = a.enrolledProgram ?? a.programInterest ?? '—';
        return (
          <Link
            href={`/counselor/students/${a.memberId}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none', minWidth: 0 }}
          >
            <Avatar initials={getInitials(a.fullName ?? 'U')} size={32} />
            <span style={{ minWidth: 0 }}>
              <span className="wa-truncate" style={{ display: 'block', fontWeight: 600, color: 'var(--wa-text)' }}>
                {a.fullName}
              </span>
              <span
                className="wa-truncate"
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--wa-accent)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {program}
              </span>
            </span>
          </Link>
        );
      },
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (a) => {
        const enrolledSlug = a.enrolledProgram ?? null;
        const progress = computeTrainingProgress(enrolledSlug, null, a.memberProgramProgress);
        const trainingProgressPct = progress.totalCourses > 0 ? progress.pct : null;
        if (trainingProgressPct === null) {
          return (
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--wa-muted)', whiteSpace: 'nowrap' }}>
              {enrolledSlug ? 'Progress unavailable' : 'Not enrolled'}
            </span>
          );
        }
        const progressColor = a.riskScore != null && a.riskScore >= RISK_MEDIUM_OR_ABOVE ? 'accent' : 'success';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 120 }}>
            <div style={{ flex: 1 }}>
              <ProgressBar pct={trainingProgressPct} color={progressColor} aria-label="Training progress" />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--wa-muted)' }}>{trainingProgressPct}%</span>
          </div>
        );
      },
    },
    {
      key: 'lastActivity',
      header: 'Last activity',
      render: (a) => (
        <span style={{ fontSize: '0.8rem', color: 'var(--wa-muted)', whiteSpace: 'nowrap' }}>
          {formatLastActivity(a.lastActivityAt)}
        </span>
      ),
    },
    {
      key: 'risk',
      header: 'Risk',
      render: (a) => <CounselorRosterRiskBadge level={a.riskLevel} />,
    },
    {
      key: 'wioa',
      header: 'WIOA',
      render: (a) => {
        const wioa = wioaBadgeProps(a.wioaReviewStatus);
        return (
          <span title={wioa.tooltip}>
            <StatusTag tone={badgeVariantToTone(wioa.variant)}>{wioa.label}</StatusTag>
          </span>
        );
      },
    },
    {
      key: 'email',
      header: 'Email',
      render: (a) => (
        <span className="wa-truncate" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--wa-muted)' }}>
          {a.email}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => {
        const statusBadge = counselorStudentStatusBadge({
          enrolledProgram: a.enrolledProgram,
          assessmentScorePct: a.assessmentScorePct,
        });
        const statusVariant = counselorStudentStatusBadgeVariant({
          enrolledProgram: a.enrolledProgram,
          assessmentScorePct: a.assessmentScorePct,
        });
        return <StatusTag tone={badgeVariantToTone(statusVariant)}>{statusBadge.label}</StatusTag>;
      },
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (a) => {
        const showMessage = a.riskScore != null && a.riskScore >= RISK_MEDIUM_OR_ABOVE;
        if (!showMessage) return null;
        return (
          <Link
            href={`/counselor/students/${a.memberId}#counselor-member-messages`}
            className="btn btn-primary btn-sm"
            style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
            onClick={(e) => e.stopPropagation()}
          >
            Message
          </Link>
        );
      },
    },
  ];

  return (
    <>
      {/* Mobile */}
      <div className="md:wa-hidden">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1rem 0.5rem',
          }}
        >
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>Active Roster</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Last activity · oldest first
          </span>
        </div>
        {filterChips}
        {toggle}
        {emptyFiltered ? (
          <div style={{ padding: '0 1rem' }}>
            <PortalEmptyState
              title={emptyTitle}
              description={emptyDescription}
              icon={<span className="material-symbols-outlined" aria-hidden>shield_person</span>}
              primaryAction={{ label: 'Clear filter', href: pathname ?? '/counselor/students' }}
            />
          </div>
        ) : (
          <div style={{ padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {visible.map((a) => {
              const initials = getInitials(a.fullName ?? 'U');
              const program = a.enrolledProgram ?? a.programInterest ?? '—';
              const enrolledSlug = a.enrolledProgram ?? null;
              const progress = computeTrainingProgress(enrolledSlug, null, a.memberProgramProgress);
              const trainingProgressPct = progress.totalCourses > 0 ? progress.pct : null;
              const statusBadge = counselorStudentStatusBadge({
                enrolledProgram: a.enrolledProgram,
                assessmentScorePct: a.assessmentScorePct,
              });
              const statusVariant = counselorStudentStatusBadgeVariant({
                enrolledProgram: a.enrolledProgram,
                assessmentScorePct: a.assessmentScorePct,
              });
              const wioa = wioaBadgeProps(a.wioaReviewStatus);
              const showMessage = a.riskScore != null && a.riskScore >= RISK_MEDIUM_OR_ABOVE;
              const progressColor = a.riskScore != null && a.riskScore >= RISK_MEDIUM_OR_ABOVE ? 'accent' : 'success';
              return (
                <div
                  key={a.assignmentId}
                  className="wa-kit-card wa-kit-card--sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.875rem',
                  }}
                >
                  <Link
                    href={`/counselor/students/${a.memberId}`}
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, minWidth: 0 }}
                  >
                    <Avatar initials={initials} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        className="wa-truncate"
                        style={{ fontWeight: 700, color: 'var(--wa-text)', fontSize: '0.9rem', margin: '0 0 0.125rem' }}
                      >
                        {a.fullName}
                      </p>
                      <p
                        className="wa-truncate"
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: 'var(--wa-accent)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          margin: '0 0 0.375rem',
                        }}
                      >
                        {program}
                      </p>
                      <p style={{ margin: '0 0 0.25rem', fontSize: '11px', fontWeight: 600, color: 'var(--wa-muted)' }}>
                        Last activity: {formatLastActivity(a.lastActivityAt)}
                      </p>
                      {trainingProgressPct === null ? (
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: 'var(--wa-muted)' }}>
                          {enrolledSlug ? 'Training progress unavailable' : 'Not enrolled'}
                        </p>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1 }}>
                            <ProgressBar pct={trainingProgressPct} color={progressColor} aria-label="Training progress" />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--wa-muted)' }}>
                            {trainingProgressPct}%
                          </span>
                        </div>
                      )}
                      <div style={{ marginTop: '0.375rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }} title={wioa.tooltip}>
                        <StatusTag tone={badgeVariantToTone(wioa.variant)}>{wioa.label}</StatusTag>
                        <CounselorRosterRiskBadge level={a.riskLevel} />
                      </div>
                    </div>
                  </Link>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem', flexShrink: 0 }}>
                    <StatusTag tone={badgeVariantToTone(statusVariant)}>{statusBadge.label}</StatusTag>
                    {showMessage ? (
                      <Link
                        href={`/counselor/students/${a.memberId}#counselor-member-messages`}
                        className="btn btn-primary btn-sm"
                        style={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Message
                      </Link>
                    ) : null}
                    <Link href={`/counselor/students/${a.memberId}`} aria-label={`Open ${a.fullName ?? 'member'}`}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--wa-muted)', fontSize: '18px' }} aria-hidden>
                        chevron_right
                      </span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop */}
      <div className="wa-hidden md:wa-block">
        {filterChipsDesktop}
        {toggleDesktop}
        {emptyFiltered ? (
          <PortalEmptyState
            title={emptyTitle}
            description={emptyDescription}
            icon={<span className="material-symbols-outlined" aria-hidden>shield_person</span>}
            primaryAction={{ label: 'Clear filter', href: pathname ?? '/counselor/students' }}
          />
        ) : (
          <DataTable<CounselorRosterClientRow>
            columns={desktopColumns}
            rows={visible}
            rowKey={(r) => r.assignmentId}
            minWidth={760}
            mobile="scroll"
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
        )}
      </div>
    </>
  );
}
