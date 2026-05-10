import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
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

export const dynamic = 'force-dynamic';

type CounselorT = Awaited<ReturnType<typeof getTranslations>>;

const PRIORITY_COLORS = {
  red: 'var(--color-accent, #b00020)',
  yellow: 'var(--color-gold, #b07d2c)',
  blue: 'var(--color-blue, #1f6feb)',
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('counselor');
  return {
    title: t('triageQueue'),
  };
}

export default async function CounselorTriagePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/triage');

  const counselor = await isCounselor(user.id);
  const admin = await isAdmin(user.id);
  if (!counselor && !admin) redirect('/dashboard');

  let queue: TriageQueue;
  try {
    queue = await getTriageQueue(user.id, { isAdmin: admin });
  } catch (err) {
    console.error('[counselor/triage] getTriageQueue failed:', err);
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

  const t = await getTranslations('counselor');

  return (
    <PortalPageFrame>
      <PageHeader
        title={t('triageQueue')}
        subtitle={t('triageSubtitle')}
        breadcrumbs={[
          { label: t('counselorPortal'), href: '/counselor' },
          { label: t('triageQueue') },
        ]}
      />

      <section style={{ padding: '0 clamp(1rem, 4vw, 1.5rem) 2rem', display: 'grid', gap: '1.5rem' }}>
        <SummaryCard queue={queue} t={t} />
        <PriorityBucket priority="red" rows={queue.red} t={t} />
        <PriorityBucket priority="yellow" rows={queue.yellow} t={t} />
        <PriorityBucket priority="blue" rows={queue.blue} t={t} />

        {queue.totals.total === 0 ? (
          <PortalEmptyState
            title={t('queueIsClear')}
            description={t('noTriageFlags')}
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

function SummaryCard({ queue, t }: { queue: TriageQueue; t: CounselorT }) {
  const counts: Array<{ label: string; value: number; key: TriageFlagType }> = [
    { label: t('noActivity10d'), value: queue.totals.byFlag.no_activity_10d, key: 'no_activity_10d' },
    { label: t('slaBreach48h'), value: queue.totals.byFlag.sla_breach_48h, key: 'sla_breach_48h' },
    { label: t('slaWarning24h'), value: queue.totals.byFlag.sla_warning_24h, key: 'sla_warning_24h' },
    { label: t('staleTraining'), value: queue.totals.byFlag.stale_training, key: 'stale_training' },
    { label: t('computerSupportFollowup'), value: queue.totals.byFlag.computer_support_followup, key: 'computer_support_followup' },
    { label: t('milestoneCelebrate'), value: queue.totals.byFlag.milestone_reached, key: 'milestone_reached' },
  ];

  return (
    <div className="content-card" style={{ padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
            {queue.totals.total} member{queue.totals.total === 1 ? '' : 's'} {t('inQueueRightNow')}
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
            {t('highestPriorityFlag')}
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
              background: 'var(--color-surface-variant, #f5f5f5)',
              fontSize: '0.8rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ color: 'var(--color-on-surface-variant)' }}>{c.label}</span>
            <strong>{c.value}</strong>
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
      {label} · {count}
    </span>
  );
}

function PriorityBucket({ priority, rows, t }: { priority: 'red' | 'yellow' | 'blue'; rows: TriageRow[]; t: CounselorT }) {
  if (rows.length === 0) return null;

  const description =
    priority === 'red'
      ? t('urgentToday')
      : priority === 'yellow'
        ? t('watchThisWeek')
        : t('celebrateWin');

  return (
    <div className="content-card" style={{ padding: '1rem 1.25rem' }}>
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
        {description}
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.75rem' }}>
        {rows.map((row) => (
          <TriageRowCard key={row.memberId} row={row} priority={priority} t={t} />
        ))}
      </ul>
    </div>
  );
}

function TriageRowCard({ row, priority, t }: { row: TriageRow; priority: 'red' | 'yellow' | 'blue'; t: CounselorT }) {
  const programLabelText = row.enrolledProgram
    ? getProgramBySlug(row.enrolledProgram)?.title ?? row.enrolledProgram
    : t('notEnrolledLabel');

  const milestoneText =
    row.context.milestoneEventName === 'certification_earned'
      ? t('earningCert')
      : row.context.milestoneEventName === 'course_completed'
        ? t('finishingCourse')
        : t('thisMilestone');

  // Filter templates to those appropriate for this priority. Pre-render
  // each template body so the client component doesn't need to import the
  // template logic.
  const programLabelForRender = row.enrolledProgram
    ? `your ${getProgramBySlug(row.enrolledProgram)?.title ?? row.enrolledProgram} track`
    : t('yourTraining');
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
        background: 'var(--color-surface-variant, #fafafa)',
        border: '1px solid var(--color-outline-variant, #ececec)',
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
            <RowMetadataInline row={row} t={t} />
          </p>
          {row.additionalFlags.length > 0 ? (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
              {t('alsoFlags')}: {row.additionalFlags.map((f) => FLAG_LABELS[f]).join(' · ')}
            </p>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {row.context.threadId ? (
            <Link
              href={`/counselor/messages?thread=${row.context.threadId}`}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            >
              {t('openThread')}
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

function RowMetadataInline({ row, t }: { row: TriageRow; t: CounselorT }) {
  const parts: string[] = [];
  if (row.context.daysInactive !== undefined) parts.push(`${row.context.daysInactive}${t('daysInactive')}`);
  if (row.context.hoursWaiting !== undefined) parts.push(`${row.context.hoursWaiting}${t('hoursWaiting')}`);
  if (row.context.staleSince) {
    const days = Math.max(
      0,
      Math.floor((Date.now() - row.context.staleSince.getTime()) / (24 * 60 * 60 * 1000)),
    );
    parts.push(t('staleDays').replace(/\bd\b/, `${days}d`));
  }
  if (row.context.lastMessagePreview) parts.push(`"${row.context.lastMessagePreview}"`);
  if (parts.length === 0) return null;
  return <span style={{ color: 'var(--color-on-surface-variant)' }}> · {parts.join(' · ')}</span>;
}

// Suppress unused warnings; templates referenced for type completeness.
void NUDGE_TEMPLATES;