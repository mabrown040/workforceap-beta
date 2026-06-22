'use client';

import type { ReactNode } from 'react';
import {
  Plus,
  Bell,
  TriangleAlert,
  Award,
  UserPlus,
  Briefcase,
} from 'lucide-react';
import {
  DesignSurface,
  KpiStrip,
  SectionHeader,
  StatusTag,
  RankBars,
  type KpiItem,
  type RankDatum,
} from '@/components/portal/kit';

/**
 * Command Center — the admin home from
 * `docs/mockups/workforceap-admin-full.html` (the `today` page).
 *
 * Faithful port of: the "Command Center" header (date + "Add Student"),
 * the KPI strip, the "What needs you today" prioritized work queue, and the
 * "Program Health" breakdown. Dense surface (admin/staff/data).
 *
 * Presentational: every prop defaults to the mockup's own numbers/copy so the
 * component renders standalone with no wiring. Target route: /admin/command-center.
 */

/** A single "What needs you today" work-queue row. */
export interface CommandCenterQueueItem {
  id: string;
  /**
   * Pre-rendered icon ELEMENT (e.g. `<TriangleAlert size={14} />`), NOT the
   * component. This is a Client Component; passing a component/function ref
   * across the Server→Client boundary throws "Functions cannot be passed
   * directly to Client Components". A rendered element is serializable, so the
   * server page builds it (lucide icons are universal) and we render it as-is.
   */
  icon: ReactNode;
  /** Chip background color (CSS color / token). Mockup roles: crimson/gold/info/green. */
  iconColor: string;
  title: string;
  detail: string;
  /** Action button label, e.g. "Assign outreach". */
  actionLabel: string;
  /** Crimson-tinted urgent treatment + primary action styling. */
  urgent?: boolean;
  /**
   * Optional navigation target for the row's action button. When present the
   * button renders as a link (server-page-friendly); otherwise it falls back
   * to the `onQueueAction` callback. Backward compatible — omit to keep the
   * callback behavior.
   */
  href?: string;
}

/** A program health row in the right-hand breakdown. */
export type ProgramHealthDatum = RankDatum;

export interface CommandCenterKitProps {
  /** Date/time shown in the header, e.g. "Tue, Jun 21 · 9:42 AM". */
  dateLabel?: string;
  /** KPI cards across the top. */
  kpis?: KpiItem[];
  /** Prioritized work-queue rows ("What needs you today"). */
  queueItems?: CommandCenterQueueItem[];
  /** Program Health breakdown rows. */
  programHealth?: ProgramHealthDatum[];
  /** Fired when the header "Add Student" button is pressed. */
  onAddStudent?: () => void;
  /**
   * Navigation target for the header "Add Student" button. When present the
   * button renders as a link (server-page-friendly) and takes precedence over
   * `onAddStudent`. Backward compatible — omit to keep the callback behavior.
   */
  addStudentHref?: string;
  /** Fired when a work-queue row's action button is pressed (passes the row id). */
  onQueueAction?: (id: string) => void;
}

/* ---- Defaults pulled straight from the mockup ---------------------------- */

const DEFAULT_KPIS: KpiItem[] = [
  { label: 'Active Students', value: '847', color: 'text', delta: '↑ 32 this month', deltaColor: 'success' },
  { label: 'Placements YTD', value: '213', color: 'success', delta: '↑ 18 this month', deltaColor: 'success' },
  { label: 'Completion Rate', value: '71%', color: 'info', delta: 'cohort avg', deltaColor: 'muted' },
  { label: 'Job-Ready Now', value: '64', color: 'gold', delta: 'ready to place', deltaColor: 'muted' },
  { label: 'At Risk', value: '19', color: 'accent', delta: 'need outreach', deltaColor: 'accent' },
];

const DEFAULT_QUEUE: CommandCenterQueueItem[] = [
  {
    id: 'inactive',
    icon: <TriangleAlert size={14} aria-hidden />,
    iconColor: 'var(--wa-accent)',
    title: '5 students inactive 14+ days',
    detail: 'Cloud & IT cohort · likely to drop',
    actionLabel: 'Assign outreach',
    urgent: true,
  },
  {
    id: 'certifications',
    icon: <Award size={14} aria-hidden />,
    iconColor: 'var(--wa-gold)',
    title: '12 certifications awaiting approval',
    detail: 'Verify proof to count toward outcomes',
    actionLabel: 'Review',
  },
  {
    id: 'applicants',
    icon: <UserPlus size={14} aria-hidden />,
    iconColor: 'var(--wa-info)',
    title: '8 new applicants need eligibility review',
    detail: 'WIOA screening pending',
    actionLabel: 'Open queue',
  },
  {
    id: 'placements',
    icon: <Briefcase size={14} aria-hidden />,
    iconColor: 'var(--wa-success)',
    title: '3 placements to confirm',
    detail: 'Employers reported hires',
    actionLabel: 'Confirm',
  },
];

const DEFAULT_PROGRAM_HEALTH: ProgramHealthDatum[] = [
  { label: 'Cloud & IT', value: '312 · 74%', pct: 74, color: 'success' },
  { label: 'Data & AI', value: '198 · 68%', pct: 68, color: 'success' },
  { label: 'Healthcare', value: '156 · 81%', pct: 81, color: 'success' },
  { label: 'Skilled Trades', value: '81 · 52%', pct: 52, color: 'accent' },
  { label: 'Manufacturing', value: '100 · 70%', pct: 70, color: 'success' },
];

/* ---- Header pieces -------------------------------------------------------- */

interface HeaderProps {
  dateLabel: string;
  onAddStudent?: () => void;
  addStudentHref?: string;
}

const ADD_STUDENT_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  background: 'var(--wa-accent)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 999,
  border: 'none',
  cursor: 'pointer',
  textDecoration: 'none',
};

function CommandCenterHeader({ dateLabel, onAddStudent, addStudentHref }: HeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1
          className="h-font"
          style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}
        >
          Command Center
        </h1>
        <span style={{ fontSize: 12, color: 'var(--wa-muted)' }}>/admin</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{ fontSize: 12, color: 'var(--wa-muted)', fontVariantNumeric: 'tabular-nums' }}
        >
          {dateLabel}
        </span>
        {addStudentHref ? (
          <a href={addStudentHref} className="wa-kit-focus" style={ADD_STUDENT_STYLE}>
            <Plus size={14} aria-hidden /> Add Student
          </a>
        ) : (
          <button type="button" onClick={onAddStudent} className="wa-kit-focus" style={ADD_STUDENT_STYLE}>
            <Plus size={14} aria-hidden /> Add Student
          </button>
        )}
        <button
          type="button"
          aria-label="Notifications"
          className="wa-kit-focus"
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            border: '1px solid var(--wa-border)',
            background: 'var(--wa-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#525252',
          }}
        >
          <Bell size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/* ---- Work-queue row ------------------------------------------------------- */

/**
 * "What needs you today" row. Mirrors the mockup faithfully: only the urgent
 * row is crimson-tinted (others sit on a neutral surface), and every row keeps
 * its own role-colored icon chip (crimson/gold/info/green). The kit's
 * <WorkQueueItem> only supports two chip colors, so this preserves the
 * per-row color the mockup shows.
 */
function WorkQueueRow({ item, onAction }: { item: CommandCenterQueueItem; onAction?: () => void }) {
    const actionStyle: React.CSSProperties = {
    flexShrink: 0,
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 999,
    cursor: 'pointer',
    textDecoration: 'none',
    border: item.urgent ? 'none' : '1px solid var(--wa-border)',
    background: item.urgent ? 'var(--wa-accent)' : 'var(--wa-surface)',
    color: item.urgent ? '#fff' : 'var(--wa-text)',
  };
  return (
    <div
      className="wa-kit-card wa-kit-card--sm wa-kit-card--hover"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: item.urgent ? 'var(--wa-accent-soft)' : '#fafafa',
        borderColor: item.urgent ? '#f3d4dc' : 'var(--wa-border)',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          background: item.iconColor,
        }}
      >
        {item.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</div>
        <div style={{ fontSize: 11, color: 'var(--wa-muted)' }}>{item.detail}</div>
      </div>
      {item.href ? (
        <a href={item.href} className="wa-kit-focus" style={actionStyle}>
          {item.actionLabel}
        </a>
      ) : (
        <button type="button" onClick={onAction} className="wa-kit-focus" style={actionStyle}>
          {item.actionLabel}
        </button>
      )}
    </div>
  );
}

/* ---- Main ----------------------------------------------------------------- */

export function CommandCenterKit({
  dateLabel = 'Tue, Jun 21 · 9:42 AM',
  kpis = DEFAULT_KPIS,
  queueItems = DEFAULT_QUEUE,
  programHealth = DEFAULT_PROGRAM_HEALTH,
  onAddStudent,
  addStudentHref,
  onQueueAction,
}: CommandCenterKitProps) {
  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <CommandCenterHeader dateLabel={dateLabel} onAddStudent={onAddStudent} addStudentHref={addStudentHref} />

      {/* KPI strip — 5 cards on desktop, 2-col on mobile. */}
      <div style={{ marginBottom: 20 }}>
        <KpiStrip cols={5} items={kpis} />
      </div>

      {/* Two-column workspace: work queue (2/3) + program health (1/3). */}
      <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-3 wa-gap-5">
        <section className="wa-kit-card lg:wa-col-span-2">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', margin: 0 }}>
              What needs you today
            </h3>
            <StatusTag tone="alert">{queueItems.length} items</StatusTag>
          </div>

          <div className="wa-space-y-2">
            {queueItems.map((item) => (
              <WorkQueueRow
                key={item.id}
                item={item}
                onAction={onQueueAction ? () => onQueueAction(item.id) : undefined}
              />
            ))}
          </div>
        </section>

        <section className="wa-kit-card">
          <SectionHeader title="Program Health" />
          <RankBars data={programHealth} />
        </section>
      </div>
    </DesignSurface>
  );
}

export default CommandCenterKit;
