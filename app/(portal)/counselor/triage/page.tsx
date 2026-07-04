import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import {
  getTriageQueue,
  FLAG_LABELS,
  type TriageRow,
  type TriageQueue,
  type TriageFlagType,
} from '@/lib/counselor/triageFlags';
import { listTemplates, NUDGE_TEMPLATES, renderNudge } from '@/lib/counselor/nudgeTemplates';
import TriageNudgePanel from '@/components/portal/counselor/TriageNudgePanel';
import { getProgramBySlug } from '@/lib/content/programs';
import { statusColor } from '@/lib/ui/statusColors';

export const dynamic = 'force-dynamic';

const PRIORITY_DESCRIPTIONS = {
  red: 'Urgent - requires action today.',
  yellow: 'Watch - touch base this week.',
  blue: 'Celebrate - reinforce a recent win.',
} as const;

// Priority dots/chips map onto lib/ui/statusColors.ts tones (red = danger,
// yellow = warning, blue = info) so they agree with StatusBadge and
// AtRiskDashboard's RISK_CONFIG elsewhere in the counselor lane.
const PRIORITY_COLORS = {
  red: statusColor('danger').fg,
  yellow: statusColor('warning').fg,
  blue: statusColor('info').fg,
} as const;

export default async function CounselorTriagePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/triage');

  const counselor = await isCounselor(user.id);
  const admin = await isAdmin(user.id);
  if (!counselor && !admin) redirect('/dashboard');

  const t = await getTranslations('counselor');

  let queue: TriageQueue;
  let loadError = false;
  try {
    queue = await getTriageQueue(user.id, { isAdmin: admin });
  } catch (err) {
    console.error('[counselor/triage] getTriageQueue failed:', err);
    loadError = true;
    queue = {
      red: [],
      yellow: [],
      blue: [],
      totals: {
        red: 0,
        yellow: 0,
        blue: 0,
        total: 0,
        byFlag: {
          no_activity_10d: 0,
          sla_breach_48h: 0,
          sla_warning_24h: 0,
          stale_training: 0,
          computer_support_followup: 0,
          milestone_reached: 0,
        },
      },
    };
  }

  return (
    <PortalPageFrame>
      <PageHeader
        title={t('triageQueueTitle')}
        subtitle={t('triageQueueSubtitle')}
        breadcrumbs={[
          { label: t('counselorPortal'), href: '/counselor' },
          { label: t('triage') },
        ]}
      />

      <section style={{ padding: '0 clamp(1rem, 4vw, 1.5rem) 2rem', display: 'grid', gap: '1.5rem' }}>
        <SummaryCard queue={queue} />
        <PriorityBucket priority="red" rows={queue.red} />
        <PriorityBucket priority="yellow" rows={queue.yellow} />
        <PriorityBucket priority="blue" rows={queue.blue} />

        {loadError ? (
          <div
            className="content-card"
            style={{
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--outline-variant)',
              borderLeft: `4px solid ${statusColor('danger').fg}`,
              background: 'var(--surface-container-low)',
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, color: statusColor('danger').fg }}>
              {t('couldntLoadTriageQueue')}
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
              {t('triageQueueLoadErrorDesc')}
            </p>
          </div>
        ) : queue.totals.total === 0 ? (
          <PortalEmptyState
            title={t('queueIsClear')}
            description={t('queueIsClearDesc')}
            icon={
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '2rem', color: 'var(--color-green)' }}
                aria-hidden="true"
              >
                done_all
              </span>
            }
            primaryAction={{ label: t('openMessages'), href: '/counselor/messages' }}
            secondaryAction={{ label: t('backToDashboard'), href: '/counselor' }}
          />
        ) : null}
      </section>
    </PortalPageFrame>
  );
}

function SummaryCard({ queue }: { queue: TriageQueue }) {
  const counts: Array<{ label: string; value: number; key: TriageFlagType }> = [
    { label: 'No activity 10+ days', value: queue.totals.byFlag.no_activity_10d, key: 'no_activity_10d' },
    { label: 'SLA breach (48h+)', value: queue.totals.byFlag.sla_breach_48h, key: 'sla_breach_48h' },
    { label: 'SLA warning (24h+)', value: queue.totals.byFlag.sla_warning_24h, key: 'sla_warning_24h' },
    { label: 'Stale training', value: queue.totals.byFlag.stale_training, key: 'stale_training' },
    { label: 'Computer support follow-up', value: queue.totals.byFlag.computer_support_followup, key: 'computer_support_followup' },
    { label: 'Milestone celebrate', value: queue.totals.byFlag.milestone_reached, key: 'milestone_reached' },
  ];

  return (
    <div
      className="content-card"
      style={{
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--outline-variant)',
        background: 'var(--surface-container-low)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{queue.totals.total}</span> member{queue.totals.total === 1 ? '' : 's'} in the queue right now
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
            Each member appears once at their highest-priority flag. Multi-flag members show their other flags inline.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <PriorityChip color={PRIORITY_COLORS.red} label="Red" count={queue.totals.red} />
          <PriorityChip color={PRIORITY_COLORS.yellow} label="Yellow" count={queue.totals.yellow} />
          <PriorityChip color={PRIORITY_COLORS.blue} label="Blue" count={queue.totals.blue} />
        </div>
      </div>

      <div
        style={{
          marginTop: '0.75rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.5rem',
        }}
      >
        {counts.map((c) => (
          <div
            key={c.key}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: 6,
              background: 'var(--surface-container-high)',
              fontSize: '0.8rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ color: 'var(--color-on-surface-variant)' }}>{c.label}</span>
            <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{c.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriorityChip({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.25rem 0.6rem',
        borderRadius: 999,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        color,
        fontSize: '0.8rem',
        fontWeight: 600,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
        }}
      />
      {label} · <span style={{ fontVariantNumeric: 'tabular-nums' }}>{count}</span>
    </span>
  );
}

function PriorityBucket({ priority, rows }: { priority: 'red' | 'yellow' | 'blue'; rows: TriageRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div
      className="content-card"
      style={{
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--outline-variant)',
        background: 'var(--surface-container-low)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span
          aria-hidden
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: PRIORITY_COLORS[priority],
            display: 'inline-block',
          }}
        />
        <h2 style={{ margin: 0, fontSize: '1.05rem', textTransform: 'capitalize' }}>{priority} · {rows.length}</h2>
      </div>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
        {PRIORITY_DESCRIPTIONS[priority]}
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.75rem' }}>
        {rows.map((row) => (
          <TriageRowCard key={row.memberId} row={row} priority={priority} />
        ))}
      </ul>
    </div>
  );
}

function TriageRowCard({ row, priority }: { row: TriageRow; priority: 'red' | 'yellow' | 'blue' }) {
  const programLabelText = row.enrolledProgram
    ? getProgramBySlug(row.enrolledProgram)?.title ?? row.enrolledProgram
    : 'Not enrolled';

  const milestoneText =
    row.context.milestoneEventName === 'certification_earned'
      ? 'earning your certification'
      : row.context.milestoneEventName === 'course_completed'
        ? 'finishing your course'
        : 'this milestone';

  // Filter templates to those appropriate for this priority. Pre-render
  // each template body so the client component doesn't need to import the
  // template logic.
  const programLabelForRender = row.enrolledProgram
    ? `your ${getProgramBySlug(row.enrolledProgram)?.title ?? row.enrolledProgram} track`
    : 'your training';
  const templates = listTemplates()
    .filter((t) => t.appliesTo.includes(priority))
    .map((t) => ({
      id: t.id,
      label: t.label,
      preview: renderNudge(t, {
        firstName: row.memberName,
        programLabel: programLabelForRender,
        milestone: milestoneText,
      }),
    }));

  return (
    <li
      style={{
        padding: '0.75rem',
        borderRadius: 8,
        background: 'var(--surface-container)',
        border: '1px solid var(--outline-variant)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <Link
            href={`/counselor/students/${row.memberId}`}
            style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}
          >
            {row.memberName}
          </Link>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
            {row.memberEmail} · {programLabelText}
          </p>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem' }}>
            <strong>{FLAG_LABELS[row.primaryFlag]}</strong>
            <RowMetadataInline row={row} />
          </p>
          {row.additionalFlags.length > 0 ? (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
              Also: {row.additionalFlags.map((f) => FLAG_LABELS[f]).join(' · ')}
            </p>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {row.context.threadId ? (
            <Link
              href={`/counselor/messages?thread=${row.context.threadId}`}
              className="btn btn-muted"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            >
              Open thread
            </Link>
          ) : null}
        </div>
      </div>

      <TriageNudgePanel
        memberId={row.memberId}
        memberName={row.memberName}
        templates={templates}
        milestone={row.context.milestoneEventName ? milestoneText : null}
      />
    </li>
  );
}

function RowMetadataInline({ row }: { row: TriageRow }) {
  const parts: string[] = [];
  if (row.context.daysInactive !== undefined) parts.push(`${row.context.daysInactive}d inactive`);
  if (row.context.hoursWaiting !== undefined) parts.push(`${row.context.hoursWaiting}h waiting`);
  if (row.context.staleSince) {
    const days = Math.max(
      0,
      Math.floor((Date.now() - row.context.staleSince.getTime()) / (24 * 60 * 60 * 1000)),
    );
    parts.push(`stale ${days}d`);
  }
  if (row.context.lastMessagePreview) parts.push(`"${row.context.lastMessagePreview}"`);
  if (parts.length === 0) return null;
  return <span style={{ color: 'var(--color-on-surface-variant)' }}> · {parts.join(' · ')}</span>;
}

// Suppress unused warnings; templates referenced for type completeness.
void NUDGE_TEMPLATES;
