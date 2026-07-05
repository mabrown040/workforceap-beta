'use client';

import type { ReactNode } from 'react';
import {
  Plus,
  Bell,
  TriangleAlert,
  Award,
  UserPlus,
  Briefcase,
  Users,
  CheckCircle2,
  Activity,
  GraduationCap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import NextLink from 'next/link';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Token } from '@astryxdesign/core/Token';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Link as AstryxLink } from '@astryxdesign/core/Link';
import {
  DesignSurface,
  SectionHeader,
  StatusTag,
  RankBars,
  AreaChartMini,
  StatSparkTile,
  QueueRow,
  CardHead,
  DataTable,
  type KpiItem,
  type RankDatum,
  type ChartDatum,
  type QueueTone,
  type Column,
  type KitTone,
  type SparkStat,
} from '@/components/portal/kit';

/**
 * Command Center — the admin home from
 * `docs/mockups/workforceap-admin-full.html` (the `today` page).
 *
 * Faithful port of: the "Command Center" header (date + "Add Student"),
 * the KPI strip, the "What needs you today" prioritized work queue, and the
 * "Program Health" breakdown. Dense surface (admin/staff/data).
 *
 * Elevated to the shared Command Center visual language (see the member
 * MemberHomeKit): `StatSparkTile` KPIs (icon + delta chip + optional
 * sparkline), an `AreaChartMini` placements trend, severity-coded `QueueRow`s,
 * plus two fully-optional panels (System health, Members) that render nothing
 * when their data isn't wired. Every new field is additive/optional so the
 * existing `app/admin/page.tsx` wiring keeps working unchanged.
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
   * Ignored when `count` is set (the count number takes the leading chip).
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
  /**
   * Explicit severity tone for the row's leading chip (red = urgent today,
   * yellow = watch, blue = fyi/celebrate). Omit to infer from `urgent` /
   * `iconColor` — every existing caller already renders sensibly without this.
   */
  tone?: QueueTone;
  /**
   * Leading score/count shown in the row's chip instead of the icon glyph
   * (e.g. `5` for "5 students inactive"). Omit to keep the icon glyph.
   */
  count?: number;
}

/** A program health row in the right-hand breakdown. */
export type ProgramHealthDatum = RankDatum;

/** A KPI tile — the plain `KpiItem` plus an optional icon + sparkline/trend. */
export interface CommandCenterKpiItem extends KpiItem {
  /**
   * Icon for the tile's chip, as a STRING KEY (e.g. 'students', 'placements',
   * 'risk') resolved to a lucide icon inside this client component. A string —
   * not a component — because this kit is a Client Component and function props
   * can't cross the server→client boundary. Omit to fall back to a
   * label-derived icon so plain `KpiItem[]` callers still render sensibly.
   */
  iconKey?: string;
  /**
   * Sparkline + delta chip. Omit to fall back to the tile's own `delta` /
   * `deltaColor` fields (rendered as a chip instead of plain text) — existing
   * callers that only set `delta` keep working, just a little richer-looking.
   */
  spark?: SparkStat;
}

/** One "System health" row (cron/system status). */
export interface CommandCenterSystemHealthRow {
  name: string;
  status: 'ok' | 'warn';
  /** Small caption, e.g. "2 errors this week" or "Nightly at 2:00 AM". */
  meta?: string;
}

/** One row in the optional "Members" roster table. */
export interface CommandCenterMemberRow {
  id: string;
  name: string;
  program: string;
  /** 0–100 course/module completion. */
  progress: number;
  /** Status chip text, e.g. "On track", "At risk". */
  status: string;
  /** Status chip tone. Defaults to 'muted'. */
  statusTone?: KitTone;
  lastActive: string;
}

export interface CommandCenterKitProps {
  /** Date/time shown in the header, e.g. "Tue, Jun 21 · 9:42 AM". */
  dateLabel?: string;
  /** KPI cards across the top. */
  kpis?: CommandCenterKpiItem[];
  /** Prioritized work-queue rows ("What needs you today"). */
  queueItems?: CommandCenterQueueItem[];
  /** Program Health breakdown rows. */
  programHealth?: ProgramHealthDatum[];
  /**
   * "Placements trend" area chart. Each datum is one month, e.g.
   * `{ label: 'Jun', value: 90 }`.
   */
  placementsByMonth?: ChartDatum[];
  /** Sub-caption under the "Placements trend" title, e.g. "2026 YTD · 213 total". */
  placementsSubtitle?: string;
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
  /** "System health" panel rows (cron/system status). Omit to hide the panel entirely. */
  systemHealth?: CommandCenterSystemHealthRow[];
  /** "Members" roster table rows. Omit/empty to hide the panel entirely. */
  members?: CommandCenterMemberRow[];
  /** Nav target for the Members panel's "View all" link. Defaults to /admin/members. */
  membersHref?: string;
}

/* ---- Defaults pulled straight from the mockup ---------------------------- */

const DEFAULT_KPIS: CommandCenterKpiItem[] = [
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
    count: 5,
  },
  {
    id: 'certifications',
    icon: <Award size={14} aria-hidden />,
    iconColor: 'var(--wa-gold)',
    title: '12 certifications awaiting approval',
    detail: 'Verify proof to count toward outcomes',
    actionLabel: 'Review',
    count: 12,
  },
  {
    id: 'applicants',
    icon: <UserPlus size={14} aria-hidden />,
    iconColor: 'var(--wa-info)',
    title: '8 new applicants need eligibility review',
    detail: 'WIOA screening pending',
    actionLabel: 'Open queue',
    count: 8,
  },
  {
    id: 'placements',
    icon: <Briefcase size={14} aria-hidden />,
    iconColor: 'var(--wa-success)',
    title: '3 placements to confirm',
    detail: 'Employers reported hires',
    actionLabel: 'Confirm',
    count: 3,
  },
];

// "Placements trend" — 2026 YTD area chart (board outcomes panel).
const DEFAULT_PLACEMENTS_BY_MONTH: ChartDatum[] = [
  { label: 'Jan', value: 38 },
  { label: 'Feb', value: 46 },
  { label: 'Mar', value: 55 },
  { label: 'Apr', value: 62 },
  { label: 'May', value: 78 },
  { label: 'Jun', value: 90 },
];

const DEFAULT_PROGRAM_HEALTH: ProgramHealthDatum[] = [
  { label: 'Cloud & IT', value: '312 · 74%', pct: 74, color: 'success' },
  { label: 'Data & AI', value: '198 · 68%', pct: 68, color: 'success' },
  { label: 'Healthcare', value: '156 · 81%', pct: 81, color: 'success' },
  { label: 'Skilled Trades', value: '81 · 52%', pct: 52, color: 'accent' },
  { label: 'Manufacturing', value: '100 · 70%', pct: 70, color: 'success' },
];

/* ---- Small pure helpers ---------------------------------------------------- */

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Explicit string-key → icon map (keeps function props off the server→client boundary). */
const KPI_ICON_MAP: Record<string, LucideIcon> = {
  students: Users,
  members: Users,
  active: Users,
  placements: Briefcase,
  jobs: Briefcase,
  interviewing: UserPlus,
  applicants: UserPlus,
  completion: GraduationCap,
  rate: GraduationCap,
  ready: Award,
  certs: Award,
  certifications: Award,
  risk: TriangleAlert,
};

/** Label-derived fallback icon so plain `KpiItem[]` callers still get a sensible chip glyph. */
function defaultKpiIcon(label: string): LucideIcon {
  const l = label.toLowerCase();
  if (l.includes('risk')) return TriangleAlert;
  if (l.includes('placement')) return Briefcase;
  if (l.includes('cert') || l.includes('ready')) return Award;
  if (l.includes('complet')) return CheckCircle2;
  if (l.includes('student') || l.includes('active')) return Users;
  return Activity;
}

/** Resolve a KPI tile's icon from its string `iconKey`, falling back to a label-derived glyph. */
function resolveKpiIcon(it: CommandCenterKpiItem): LucideIcon {
  if (it.iconKey && KPI_ICON_MAP[it.iconKey]) return KPI_ICON_MAP[it.iconKey];
  return defaultKpiIcon(it.label);
}

/** Falls back to the tile's plain `delta`/`deltaColor` (as a chip) when `spark` isn't set. */
function kpiSpark(it: CommandCenterKpiItem): SparkStat | undefined {
  if (it.spark) return it.spark;
  if (it.delta) return { delta: it.delta, direction: it.deltaColor === 'accent' ? 'down' : 'up' };
  return undefined;
}

/** Infers a QueueRow severity tone from the row's existing `urgent`/`iconColor` fields when `tone` isn't set explicitly. */
function inferQueueTone(item: CommandCenterQueueItem): QueueTone {
  if (item.tone) return item.tone;
  if (item.urgent) return 'red';
  if (item.iconColor.includes('accent') || item.iconColor.includes('danger')) return 'red';
  if (item.iconColor.includes('gold')) return 'yellow';
  return 'blue';
}

/* ---- Header pieces -------------------------------------------------------- */

interface HeaderProps {
  dateLabel: string;
  onAddStudent?: () => void;
  addStudentHref?: string;
}

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

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span
          style={{ fontSize: 12, color: 'var(--wa-muted)', fontVariantNumeric: 'tabular-nums' }}
        >
          {dateLabel}
        </span>
        {addStudentHref ? (
          <AstryxLink href={addStudentHref} as={NextLink as never} isStandalone>
            <Button label="Add Student" variant="primary" size="md" icon={<Plus size={14} aria-hidden />} />
          </AstryxLink>
        ) : (
          <Button
            label="Add Student"
            variant="primary"
            size="md"
            icon={<Plus size={14} aria-hidden />}
            onClick={onAddStudent}
          />
        )}
        <AstryxLink href="/admin/messages" as={NextLink as never} isStandalone>
          <IconButton label="Notifications" icon={<Bell size={16} aria-hidden />} variant="secondary" size="md" />
        </AstryxLink>
      </div>
    </div>
  );
}

/* ---- Work-queue row --------------------------------------------------------
 * Thin wrapper around the shared `QueueRow` primitive: derives a red/yellow/
 * blue severity tone (so every admin queue reads the same as the counselor/
 * partner triage queues) and renders the action as an Astryx `Button`
 * (`primary` for `urgent`, `secondary` otherwise) plus the href-vs-callback
 * affordance from the original implementation.
 */

function WorkQueueRow({ item, onAction }: { item: CommandCenterQueueItem; onAction?: () => void }) {
  const tone = inferQueueTone(item);
  const leadingIcon =
    typeof item.count === 'number' ? (
      <span style={{ fontWeight: 800, fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{item.count}</span>
    ) : (
      item.icon
    );
  const actionVariant = item.urgent ? 'primary' : 'secondary';
  const action = item.href ? (
    <AstryxLink href={item.href} as={NextLink as never} isStandalone>
      <Button label={item.actionLabel} variant={actionVariant} size="sm" />
    </AstryxLink>
  ) : (
    <Button label={item.actionLabel} variant={actionVariant} size="sm" onClick={onAction} />
  );

  return <QueueRow tone={tone} icon={leadingIcon} title={item.title} meta={item.detail} action={action} />;
}

/* ---- Members table columns ------------------------------------------------ */

const memberColumns: Column<CommandCenterMemberRow>[] = [
  {
    key: 'name',
    header: 'Member',
    render: (row) => <span style={{ fontWeight: 700, fontSize: 13 }}>{row.name}</span>,
  },
  {
    key: 'program',
    header: 'Program',
    render: (row) => <span style={{ fontSize: 12, color: 'var(--wa-muted)' }}>{row.program}</span>,
  },
  {
    key: 'progress',
    header: 'Progress',
    render: (row) => {
      const pct = clampPct(row.progress);
      return (
        <div className="wa-flex wa-items-center wa-gap-2">
          <div className="wa-kit-bar-track" style={{ width: 80 }}>
            <div className="wa-kit-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--wa-muted)', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
        </div>
      );
    },
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusTag tone={row.statusTone ?? 'muted'}>{row.status}</StatusTag>,
  },
  {
    key: 'lastActive',
    header: 'Last active',
    align: 'right',
    render: (row) => (
      <span style={{ fontSize: 12, color: 'var(--wa-muted)', fontVariantNumeric: 'tabular-nums' }}>
        {row.lastActive}
      </span>
    ),
  },
];

/* ---- Main ----------------------------------------------------------------- */

export function CommandCenterKit({
  dateLabel = 'Tue, Jun 21 · 9:42 AM',
  kpis = DEFAULT_KPIS,
  queueItems = DEFAULT_QUEUE,
  programHealth = DEFAULT_PROGRAM_HEALTH,
  placementsByMonth = DEFAULT_PLACEMENTS_BY_MONTH,
  placementsSubtitle = '2026 YTD',
  onAddStudent,
  addStudentHref,
  onQueueAction,
  systemHealth,
  members,
  membersHref = '/admin/members',
}: CommandCenterKitProps) {
  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <CommandCenterHeader dateLabel={dateLabel} onAddStudent={onAddStudent} addStudentHref={addStudentHref} />

      {/* KPI strip — 5 cards on desktop (lg, unchanged), 2-up on small
          tablets/large phones (sm), and 1-up on the smallest phones so a long
          tabular value never forces horizontal overflow at 360–414px. Each
          tile is an icon chip + optional delta chip + big tabular value +
          optional inline sparkline (StatSparkTile), matching the member
          Command Center's KPI row. */}
      <div
        className="wa-grid wa-grid-cols-1 sm:wa-grid-cols-2 lg:wa-grid-cols-5 wa-gap-3"
        style={{ marginBottom: 20 }}
      >
        {kpis.map((it) => {
          const Icon = resolveKpiIcon(it);
          return (
            <StatSparkTile
              key={it.label}
              icon={<Icon size={16} />}
              label={it.label}
              value={it.value}
              color={it.color ?? 'accent'}
              spark={kpiSpark(it)}
            />
          );
        })}
      </div>

      {/* Two-column workspace: work queue (2/3) + program health (1/3). */}
      <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-3 wa-gap-5">
        {/* `minWidth: 0` lets these grid columns shrink to the viewport on
            phones (grid items default to `min-width: auto`); desktop unchanged. */}
        <Card className="lg:wa-col-span-2" style={{ minWidth: 0 }}>
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
            <Token label={`${queueItems.length} items`} size="sm" color="pink" />
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
        </Card>

        <Card style={{ minWidth: 0 }}>
          <SectionHeader title="Program Health" />
          <RankBars data={programHealth} />
        </Card>
      </div>

      {/* Placements trend — area chart (mockup `board`), surfaced on the
          command center so the operator sees the trend in context. */}
      {placementsByMonth.length > 1 ? (
        <Card className="wa-mt-5" style={{ minWidth: 0 }}>
          <CardHead title="Placements trend" />
          <p style={{ fontSize: 11, color: 'var(--wa-muted)', margin: '-8px 0 12px' }}>{placementsSubtitle}</p>
          <AreaChartMini
            data={placementsByMonth}
            id="admin-cc-placements"
            color="accent"
            height={176}
            ariaLabel={`Placements trend, ${placementsSubtitle}`}
          />
        </Card>
      ) : null}

      {/* System health — optional; renders nothing when the caller hasn't
          wired any cron/system signals. */}
      {systemHealth && systemHealth.length > 0 ? (
        <Card className="wa-mt-5" style={{ minWidth: 0 }}>
          <CardHead title="System health" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {systemHealth.map((row) => (
              <div key={row.name} className="wa-flex wa-items-center wa-justify-between" style={{ gap: 12 }}>
                <span className="wa-flex wa-items-center wa-gap-2" style={{ minWidth: 0 }}>
                  <StatusDot
                    variant={row.status === 'ok' ? 'success' : 'warning'}
                    label={row.status === 'ok' ? `${row.name} operating normally` : `${row.name} needs attention`}
                  />
                  <span style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.name}
                  </span>
                </span>
                <span className="wa-flex wa-items-center wa-gap-2" style={{ flexShrink: 0 }}>
                  {row.meta ? (
                    <span style={{ fontSize: 11, color: 'var(--wa-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {row.meta}
                    </span>
                  ) : null}
                  <StatusTag tone={row.status === 'ok' ? 'ok' : 'warn'}>{row.status === 'ok' ? 'OK' : 'Warn'}</StatusTag>
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Members — optional roster table; renders nothing when the caller
          hasn't wired any rows. */}
      {members && members.length > 0 ? (
        <Card className="wa-mt-5" style={{ minWidth: 0 }}>
          <CardHead title="Members" linkLabel="View all" linkHref={membersHref} />
          <DataTable<CommandCenterMemberRow>
            columns={memberColumns}
            rows={members}
            rowKey={(row) => row.id}
            minWidth={560}
            emptyTitle="No members yet"
          />
        </Card>
      ) : null}
    </DesignSurface>
  );
}

export default CommandCenterKit;
