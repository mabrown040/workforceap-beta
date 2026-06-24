'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DesignSurface,
  DataTable,
  Avatar,
  StatusTag,
  ProgressBar,
  type Column,
  type KitTone,
} from '@/components/portal/kit';

/**
 * Partner › Referred members — portal v2 reskin.
 * Target route: /partner/referred-members
 *
 * Replaces the legacy desktop `PartnerMembersList` (search + stage <select>
 * over `.partner-member-card` rows) and the mobile `PartnerReferredMembersMobile`
 * (chip filters + hand-rolled avatar cards) with a single kit-composed view:
 * DesignSurface + search/select controls + DataTable mobile="cards".
 *
 * Behavior preserved verbatim from the desktop list: substring search across
 * fullName + programTitle + story + stageLabel + referredAtLabel, exact-stage
 * <select> filter, the "N member(s) shown" count, and the two distinct empty
 * states (zero-referrals invite prompt vs no-filter-match prompt).
 */
export type PartnerMemberRow = {
  id: string;
  fullName: string | null;
  stage: string;
  stageLabel: string;
  progress: number;
  programTitle: string;
  story: string;
  referredAtLabel: string;
};

/**
 * Map pipeline stage → kit tone. Mirrors the legacy badge color semantics:
 * placed reads success/green, certified success, training/enrolled info,
 * applied/closed muted. The synthetic at-risk state (progress<30 &&
 * in_training) is overridden to 'warn' (gold) — see toneFor().
 */
const STAGE_TONE: Record<string, KitTone> = {
  placed: 'ok',
  certified: 'ok',
  in_training: 'info',
  enrolled: 'info',
  applied: 'muted',
  closed: 'muted',
};

function isAtRisk(row: PartnerMemberRow): boolean {
  return row.progress < 30 && row.stage === 'in_training';
}

function toneFor(row: PartnerMemberRow): KitTone {
  if (isAtRisk(row)) return 'warn';
  return STAGE_TONE[row.stage] ?? 'muted';
}

function initialsFor(fullName: string | null): string {
  return (fullName ?? '?')
    .split(' ')
    .map((name) => name[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function PartnerReferredMembersKit({ rows }: { rows: PartnerMemberRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((member) => {
      if (stage !== 'all' && member.stage !== stage) return false;
      if (!q) return true;
      return [
        member.fullName ?? '',
        member.programTitle,
        member.story,
        member.stageLabel,
        member.referredAtLabel,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, stage]);

  const MemberCell = ({ row }: { row: PartnerMemberRow }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <Avatar initials={initialsFor(row.fullName)} size={32} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.fullName}
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--wa-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.story}
        </div>
      </div>
    </div>
  );

  const ProgressCell = ({ row }: { row: PartnerMemberRow }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 72 }}>
        <ProgressBar
          pct={row.progress}
          color={isAtRisk(row) ? 'gold' : 'success'}
          aria-label={`${row.fullName ?? 'Member'} progress ${row.progress}%`}
        />
      </div>
      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11, color: 'var(--wa-muted)' }}>
        {row.progress}%
      </span>
    </div>
  );

  const columns: Column<PartnerMemberRow>[] = [
    { key: 'name', header: 'Member', render: (row) => <MemberCell row={row} /> },
    {
      key: 'program',
      header: 'Program',
      render: (row) => <span style={{ color: 'var(--wa-muted)' }}>{row.programTitle}</span>,
    },
    { key: 'progress', header: 'Progress', render: (row) => <ProgressCell row={row} /> },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusTag tone={toneFor(row)}>{row.stageLabel}</StatusTag>,
    },
    {
      key: 'referredAt',
      header: 'Referred',
      align: 'right',
      render: (row) => <span style={{ color: 'var(--wa-muted)' }}>{row.referredAtLabel}</span>,
    },
  ];

  // Two distinct empty states preserved from the legacy view.
  const emptyTitle = rows.length === 0 ? 'No members yet' : 'No members match this filter';
  const emptyDescription =
    rows.length === 0
      ? "You haven't referred any members yet. Use the Invite Member button to start."
      : 'Try clearing your search or changing the stage filter.';

  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members, program, or status"
          aria-label="Search referred members by name, program, or status"
          className="wa-kit-focus"
          style={{
            minWidth: 260,
            flex: '1 1 280px',
            padding: '0.7rem 0.9rem',
            borderRadius: 8,
            border: '1px solid var(--wa-border)',
            background: 'var(--wa-surface)',
            color: 'var(--wa-text)',
          }}
        />
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          aria-label="Filter by member journey stage"
          className="wa-kit-focus"
          style={{
            padding: '0.7rem 0.9rem',
            borderRadius: 8,
            border: '1px solid var(--wa-border)',
            background: 'var(--wa-surface)',
            color: 'var(--wa-text)',
          }}
        >
          <option value="all">All stages</option>
          <option value="applied">Applied</option>
          <option value="enrolled">Enrolled</option>
          <option value="in_training">In training</option>
          <option value="certified">Certified</option>
          <option value="placed">Placed</option>
        </select>
      </div>
      <p style={{ color: 'var(--wa-muted)', marginBottom: '0.75rem', fontSize: 13 }}>
        {filtered.length} member{filtered.length !== 1 ? 's' : ''} shown
      </p>

      <DataTable<PartnerMemberRow>
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/partner/referred-members/${row.id}`)}
        minWidth={760}
        mobile="cards"
        cardRender={(row) => (
          <div className="wa-kit-card wa-kit-card--sm">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <MemberCell row={row} />
              </div>
              <div style={{ flexShrink: 0 }}>
                <StatusTag tone={toneFor(row)}>{row.stageLabel}</StatusTag>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--wa-muted)', margin: '12px 0 4px' }}>
              {row.programTitle} · Referred {row.referredAtLabel}
            </div>
            <ProgressBar
              pct={row.progress}
              color={isAtRisk(row) ? 'gold' : 'success'}
              aria-label={`${row.fullName ?? 'Member'} progress ${row.progress}%`}
            />
          </div>
        )}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    </DesignSurface>
  );
}
