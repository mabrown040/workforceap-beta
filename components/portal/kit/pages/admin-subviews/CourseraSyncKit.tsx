import type { ReactNode } from 'react';
import {
  CircleCheck,
  TriangleAlert,
  RefreshCw,
  Link2,
  Clock,
  Users,
  Gauge,
  CircleSlash,
  Activity,
} from 'lucide-react';
import {
  DesignSurface,
  SectionHeader,
  StatusTag,
  type KitTone,
} from '@/components/portal/kit';

/**
 * Coursera Sync — sync-status card + unmatched-learners list (dense).
 * Mockup: workforceap-admin-full.html "coursera" view (LEFT "Sync Status" card
 * with a Force Sync action; RIGHT "Unmatched Learners" card with a per-row
 * Link affordance).
 * Target route: /admin/coursera
 *
 * Pure read view — no 'use client'. All loading happens in the page; the
 * interactive Force Sync / Link bindings live in the legacy view (?ui=legacy),
 * which this kit links out to. That keeps the kit a server component and avoids
 * mounting the heavy admin client tooling on the default path.
 *
 * HONEST DATA NOTE: Coursera B4B is off in preview (creds are prod-only), so
 * "B4B API latency" has no live value here — the page passes `b4bLatency: null`
 * and we render "unavailable in preview" rather than the mockup's fabricated
 * "240ms". Likewise learner-sync coverage is "—" when unknown.
 */

export type SyncHealth = 'healthy' | 'attention' | 'idle' | 'unavailable';

export interface UnmatchedLearnerRow {
  /** Lowercased external email (the row key + Link target). */
  email: string;
  /** Best-known display name, or null. */
  name: string | null;
  /** One-line caption: course/badge/event context (e.g. "AWS Cloud Practitioner · 64%"). */
  caption: string;
  /** Detail/link-binding route for this learner. */
  href: string;
}

export interface CourseraSyncKitProps {
  /** Overall sync health (drives the status chip + icon). */
  health: SyncHealth;
  /** Human status label, e.g. "Healthy", "Needs attention", "Unavailable in preview". */
  healthLabel: string;
  /** "Last sync" caption (e.g. "3 min ago", or "—"). */
  lastSync: string;
  /** "Learners synced" caption (e.g. "812", "812 / 847", or "—"). */
  learnersSynced: string;
  /**
   * "B4B API latency" caption. Pass null when unavailable (preview): the card
   * then shows "unavailable in preview" instead of a fabricated number.
   */
  b4bLatency: string | null;
  /** "Errors (24h)" / statements-needing-attention count caption (e.g. "0", "12"). */
  errors: string;
  /** Unmatched learners (Coursera identities with no bound WAP member). */
  unmatched: UnmatchedLearnerRow[];
  /** Total distinct unmatched count for the "N to link" chip (may exceed shown rows). */
  unmatchedTotal: number;
  /** Force Sync target — the legacy interactive view that hosts the real button. */
  forceSyncHref: string;
  /** Header action (e.g. a link to Coursera health diagnostics). */
  headerAction?: ReactNode;
  /** Count of members with `courseraEnrollmentApproved = true` (seats used against budget). */
  approvedForEnrollment: string;
  /** Distinct members with an xAPI statement in the last 30 days (actively syncing). */
  activeLast30Days: string;
}

function healthTone(health: SyncHealth): KitTone {
  switch (health) {
    case 'healthy':
      return 'ok';
    case 'attention':
      return 'alert';
    case 'unavailable':
      return 'muted';
    default:
      return 'info';
  }
}

function healthColorVar(health: SyncHealth): string {
  switch (health) {
    case 'healthy':
      return 'var(--wa-success)';
    case 'attention':
      return 'var(--wa-accent)';
    case 'unavailable':
      return 'var(--wa-muted)';
    default:
      return 'var(--wa-info)';
  }
}

function healthChipBg(health: SyncHealth): string {
  switch (health) {
    case 'healthy':
      return 'color-mix(in srgb, var(--wa-success) 12%, transparent)';
    case 'attention':
      return 'var(--wa-accent-soft)';
    case 'unavailable':
      return 'color-mix(in srgb, var(--wa-muted) 12%, transparent)';
    default:
      return 'color-mix(in srgb, var(--wa-info) 12%, transparent)';
  }
}

interface StatRow {
  icon: ReactNode;
  label: string;
  value: string;
  /** When true, render the value muted (e.g. "unavailable in preview"). */
  muted?: boolean;
  /** When true, render the value in the accent color (e.g. nonzero errors). */
  alert?: boolean;
}

export function CourseraSyncKit({
  health,
  healthLabel,
  lastSync,
  learnersSynced,
  b4bLatency,
  errors,
  unmatched,
  unmatchedTotal,
  forceSyncHref,
  headerAction,
  approvedForEnrollment,
  activeLast30Days,
}: CourseraSyncKitProps) {
  const color = healthColorVar(health);
  const HealthIcon = health === 'attention' ? TriangleAlert : CircleCheck;

  const rows: StatRow[] = [
    { icon: <Clock size={14} />, label: 'Last sync', value: lastSync },
    { icon: <Users size={14} />, label: 'Learners synced', value: learnersSynced },
    {
      icon: <Gauge size={14} />,
      label: 'B4B API latency',
      value: b4bLatency ?? 'unavailable in preview',
      muted: b4bLatency === null,
    },
    {
      icon: <CircleSlash size={14} />,
      label: 'Errors (24h)',
      value: errors,
      alert: errors !== '0' && errors !== '—',
    },
    { icon: <CircleCheck size={14} />, label: 'Approved for enrollment', value: approvedForEnrollment },
    { icon: <Activity size={14} />, label: 'Active in last 30 days', value: activeLast30Days },
  ];

  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <SectionHeader
        title="Coursera Sync"
        kicker="Integrations"
        goal="Keep Coursera learning flowing into the right members"
        action={headerAction}
      />

      <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-3 wa-gap-4">
        {/* LEFT — Sync Status card + Force Sync action. */}
        <div className="wa-kit-card" style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: healthChipBg(health),
                color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <HealthIcon size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Sync Status</div>
              <div style={{ marginTop: 2 }}>
                <StatusTag tone={healthTone(health)}>{healthLabel}</StatusTag>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {rows.map((r) => (
              <div
                key={r.label}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 12,
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    color: 'var(--wa-muted)',
                    minWidth: 0,
                  }}
                >
                  <span style={{ color: 'var(--wa-muted)', flexShrink: 0 }}>{r.icon}</span>
                  {r.label}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    color: r.alert
                      ? 'var(--wa-accent)'
                      : r.muted
                        ? 'var(--wa-muted)'
                        : 'var(--wa-text)',
                    fontStyle: r.muted ? 'italic' : 'normal',
                  }}
                >
                  {r.value}
                </span>
              </div>
            ))}
          </div>

          <a
            href={forceSyncHref}
            className="wa-kit-focus"
            style={{
              marginTop: 18,
              width: '100%',
              boxSizing: 'border-box',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 999,
              background: 'var(--wa-accent)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <RefreshCw size={14} />
            Force Sync
          </a>
          <p
            style={{
              marginTop: 8,
              fontSize: 11,
              color: 'var(--wa-muted)',
              textAlign: 'center',
            }}
          >
            Opens the sync &amp; mapping tools
          </p>
        </div>

        {/* RIGHT — Unmatched learners + per-row Link affordance. */}
        <div className="wa-kit-card lg:wa-col-span-2" style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 4,
            }}
          >
            <h3 style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>
              Unmatched Learners
            </h3>
            {unmatchedTotal > 0 ? (
              <StatusTag tone="alert">{unmatchedTotal} to link</StatusTag>
            ) : (
              <StatusTag tone="ok">All linked</StatusTag>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--wa-muted)', margin: '0 0 14px' }}>
            Coursera emails with no matching member. Link one so its progress flows into the portal.
          </p>

          {unmatched.length === 0 ? (
            <div className="wa-kit-card wa-kit-card--sm" style={{ margin: 0 }}>
              <div style={{ fontWeight: 700, color: 'var(--wa-text)' }}>No unmatched learners</div>
              <div style={{ marginTop: 4, fontSize: 13, color: 'var(--wa-muted)' }}>
                Every Coursera identity with activity is bound to a WorkforceAP member — or no
                Coursera activity has arrived yet.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {unmatched.map((row) => (
                <div
                  key={row.email}
                  className="wa-kit-card wa-kit-card--sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={row.name ? `${row.name} · ${row.email}` : row.email}
                    >
                      {row.name || row.email}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--wa-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.name ? `${row.email} · ` : ''}
                      {row.caption}
                    </div>
                  </div>
                  <a
                    href={row.href}
                    className="wa-kit-focus"
                    style={{
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 13px',
                      borderRadius: 999,
                      background: 'var(--wa-info)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <Link2 size={12} />
                    Link
                  </a>
                </div>
              ))}
            </div>
          )}

          {unmatchedTotal > unmatched.length ? (
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--wa-muted)', marginTop: 14 }}>
              Showing {unmatched.length} of {unmatchedTotal}
            </p>
          ) : null}
        </div>
      </div>
    </DesignSurface>
  );
}
