'use client';

import Link from 'next/link';
import {
  DesignSurface,
  SectionHeader,
  DataTable,
  StatusTag,
  type Column,
  type KitTone,
} from '@/components/portal/kit';

/**
 * Duplicate students — likely-duplicate member accounts rendered as a dense
 * review table. Mockup: workforceap-admin-full.html "duplicates" view.
 * Target route: /admin/members/duplicates
 *
 * Columns: Match · Student A · Student B · Confidence · Action.
 * Each row is one candidate pair drawn from a real duplicate group (members
 * that share a lowercased email). "Match" describes which signals overlapped
 * (Email, Email + name, Email + phone, …) and "Confidence" is derived from how
 * many of those signals agree. Action links to the existing merge workspace.
 */

export interface DuplicateRow {
  /** Stable key — the canonical (lowercased) email + the two member ids. */
  id: string;
  /** What overlapped, e.g. "Email + name" or "Email". */
  matchKind: string;
  /** Display label for the first (kept) candidate. */
  studentA: string;
  /** Display label for the second (merge-into) candidate. */
  studentB: string;
  /** Confidence percentage 0–100, derived from overlapping signals. */
  confidence: number;
  /** Pre-built href into the merge workspace for this pair. */
  mergeHref: string;
}

export interface DuplicatesKitProps {
  rows?: DuplicateRow[];
  /** Total number of duplicate groups detected (for the subtitle). */
  groupCount?: number;
}

const DEFAULT_ROWS: DuplicateRow[] = [
  {
    id: 'demo-1',
    matchKind: 'Email + name',
    studentA: 'mike.brown@…',
    studentB: 'm.brown@…',
    confidence: 94,
    mergeHref: '/admin/members/merge',
  },
  {
    id: 'demo-2',
    matchKind: 'Phone',
    studentA: 'j.davis (id 412)',
    studentB: 'jdavis (id 889)',
    confidence: 81,
    mergeHref: '/admin/members/merge',
  },
];

/** Higher confidence → calmer tone; lower → flag for review. */
function confidenceTone(confidence: number): KitTone {
  if (confidence >= 90) return 'alert';
  if (confidence >= 75) return 'warn';
  return 'info';
}

export function DuplicatesKit({ rows = DEFAULT_ROWS, groupCount }: DuplicatesKitProps) {
  const count = groupCount ?? rows.length;
  const subtitle =
    count === 0
      ? 'No likely duplicate accounts to merge'
      : `Likely duplicate accounts to merge — ${count.toLocaleString()} ${
          count === 1 ? 'pair' : 'pairs'
        } flagged`;

  const columns: Column<DuplicateRow>[] = [
    {
      key: 'matchKind',
      header: 'Match',
      render: (row) => (
        <span style={{ fontWeight: 700 }}>{row.matchKind}</span>
      ),
    },
    {
      key: 'studentA',
      header: 'Student A',
      render: (row) => (
        <span style={{ color: 'var(--wa-muted)' }}>{row.studentA}</span>
      ),
    },
    {
      key: 'studentB',
      header: 'Student B',
      render: (row) => (
        <span style={{ color: 'var(--wa-muted)' }}>{row.studentB}</span>
      ),
    },
    {
      key: 'confidence',
      header: 'Confidence',
      render: (row) => (
        <StatusTag tone={confidenceTone(row.confidence)}>{row.confidence}%</StatusTag>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (row) => (
        <Link
          href={row.mergeHref}
          className="wa-kit-focus"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 14px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            textDecoration: 'none',
            border: '1px solid var(--wa-border)',
            color: 'var(--wa-text)',
            whiteSpace: 'nowrap',
          }}
        >
          Review &amp; merge
        </Link>
      ),
    },
  ];

  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <SectionHeader title="Duplicate students" kicker="Members" goal={subtitle} />

      <DataTable<DuplicateRow>
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        minWidth={720}
        mobile="cards"
        cardRender={(row) => (
          <div className="wa-kit-card wa-kit-card--sm">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.matchKind}
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
                  {row.studentA} ↔ {row.studentB}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <StatusTag tone={confidenceTone(row.confidence)}>{row.confidence}%</StatusTag>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <Link
                href={row.mergeHref}
                className="wa-kit-focus"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '6px 14px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  textDecoration: 'none',
                  border: '1px solid var(--wa-border)',
                  color: 'var(--wa-text)',
                }}
              >
                Review &amp; merge
              </Link>
            </div>
          </div>
        )}
        emptyTitle="No likely duplicates"
        emptyDescription="Every active member email is unique. Flagged duplicate pairs will appear here when detected."
      />
    </DesignSurface>
  );
}
