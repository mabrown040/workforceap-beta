'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import StatusBadge from '@/components/portal/StatusBadge';
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

const RISK_BADGE_STYLES: Record<'CRITICAL' | 'HIGH' | 'MEDIUM', { label: string; bg: string; color: string; border: string }> = {
  CRITICAL: {
    label: 'Critical',
    bg: 'color-mix(in srgb, #dc2626 14%, transparent)',
    color: '#b91c1c',
    border: 'color-mix(in srgb, #dc2626 35%, transparent)',
  },
  HIGH: {
    label: 'High',
    bg: 'color-mix(in srgb, #ea580c 14%, transparent)',
    color: '#c2410c',
    border: 'color-mix(in srgb, #ea580c 35%, transparent)',
  },
  MEDIUM: {
    label: 'Medium',
    bg: 'color-mix(in srgb, #ca8a04 18%, transparent)',
    color: '#a16207',
    border: 'color-mix(in srgb, #ca8a04 40%, transparent)',
  },
};

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
  const s = RISK_BADGE_STYLES[level];
  return (
    <span
      title={`Risk: ${s.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.15rem 0.5rem',
        borderRadius: '9999px',
        fontSize: '10px',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        flexShrink: 0,
      }}
    >
      {s.label}
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

type Props = { rows: CounselorRosterClientRow[] };

export default function CounselorStudentsRosterClient({ rows }: Props) {
  const [atRiskOnly, setAtRiskOnly] = useState(false);

  const visible = useMemo(() => {
    if (!atRiskOnly) return rows;
    return rows.filter((r) => r.riskScore != null && r.riskScore >= RISK_MEDIUM_OR_ABOVE);
  }, [rows, atRiskOnly]);

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

  const emptyFiltered = visible.length === 0 && atRiskOnly;

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
        {toggle}
        {emptyFiltered ? (
          <div style={{ padding: '0 1rem' }}>
            <PortalEmptyState
              title="No at-risk members in your roster"
              description="Everyone is below the medium risk threshold, or alerts have not run yet."
              icon={<span className="material-symbols-outlined" aria-hidden>shield_person</span>}
              primaryAction={{ label: 'At-risk dashboard', href: '/counselor/at-risk' }}
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
              return (
                <div
                  key={a.assignmentId}
                  className="portal-kpi-card"
                  style={{
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.875rem',
                    border: '1px solid var(--outline-variant)',
                  }}
                >
                  <Link
                    href={`/counselor/students/${a.memberId}`}
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, minWidth: 0 }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '0.625rem',
                        background: 'var(--color-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.875rem' }}>{initials}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        className="wa-truncate"
                        style={{ fontWeight: 700, color: 'var(--color-on-surface)', fontSize: '0.9rem', margin: '0 0 0.125rem' }}
                      >
                        {a.fullName}
                      </p>
                      <p
                        className="wa-truncate"
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: 'var(--color-accent)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          margin: '0 0 0.375rem',
                        }}
                      >
                        {program}
                      </p>
                      <p style={{ margin: '0 0 0.25rem', fontSize: '11px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>
                        Last activity: {formatLastActivity(a.lastActivityAt)}
                      </p>
                      {trainingProgressPct === null ? (
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>
                          {enrolledSlug ? 'Training progress unavailable' : 'Not enrolled'}
                        </p>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              flex: 1,
                              height: 4,
                              background: 'var(--surface-container)',
                              borderRadius: '9999px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${trainingProgressPct}%`,
                                background: 'var(--color-accent)',
                                borderRadius: '9999px',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>
                            {trainingProgressPct}%
                          </span>
                        </div>
                      )}
                      <div style={{ marginTop: '0.375rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }} title={wioa.tooltip}>
                        <StatusBadge label={wioa.label} variant={wioa.variant} />
                        <CounselorRosterRiskBadge level={a.riskLevel} />
                      </div>
                    </div>
                  </Link>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem', flexShrink: 0 }}>
                    <StatusBadge label={statusBadge.label} variant={statusVariant} />
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
                      <span className="material-symbols-outlined" style={{ color: 'var(--outline-variant)', fontSize: '18px' }} aria-hidden>
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
        {toggleDesktop}
        {emptyFiltered ? (
          <PortalEmptyState
            title="No at-risk members in your roster"
            description="Everyone is below the medium risk threshold, or alerts have not run yet."
            icon={<span className="material-symbols-outlined" aria-hidden>shield_person</span>}
            primaryAction={{ label: 'At-risk dashboard', href: '/counselor/at-risk' }}
          />
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
            {visible.map((a) => {
              const wioa = wioaBadgeProps(a.wioaReviewStatus);
              const showMessage = a.riskScore != null && a.riskScore >= RISK_MEDIUM_OR_ABOVE;
              return (
                <li key={a.assignmentId}>
                  <div
                    style={{
                      display: 'flex',
                      width: '100%',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--outline-variant)',
                      background: 'var(--surface-container-lowest)',
                    }}
                  >
                    <Link href={`/counselor/students/${a.memberId}`} style={{ fontWeight: 600, flex: '1 1 160px', minWidth: 0 }}>
                      {a.fullName}
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                        Last: {formatLastActivity(a.lastActivityAt)}
                      </span>
                      <CounselorRosterRiskBadge level={a.riskLevel} />
                      <span title={wioa.tooltip}>
                        <StatusBadge label={wioa.label} variant={wioa.variant} />
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>{a.email}</span>
                      {showMessage ? (
                        <Link
                          href={`/counselor/students/${a.memberId}#counselor-member-messages`}
                          className="btn btn-primary btn-sm"
                          style={{ flexShrink: 0 }}
                        >
                          Message
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
