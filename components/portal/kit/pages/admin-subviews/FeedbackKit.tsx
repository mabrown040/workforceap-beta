import {
  DesignSurface,
  SectionHeader,
  KpiStrip,
  DataTable,
  Avatar,
  StatusTag,
  type Column,
  type KpiItem,
  type KitTone,
} from '@/components/portal/kit';

/**
 * Member feedback — submissions rendered as a dense read table.
 * No mockup; consistent dense kit treatment (mirrors CounselorsRosterKit /
 * JobsBoardKit). Target route: /admin/feedback
 *
 * Server-rendered: the page loader does all aggregation and hands plain rows in.
 * Wide table collapses to stacked cards on mobile via DataTable mobile="cards".
 *
 * Feedback has no workflow "status" field — submissions are rated 1–5. We derive
 * a sentiment status from the rating (Positive ≥4 / Neutral =3 / Critical ≤2) so
 * the Status column carries real, meaningful information.
 */

export type FeedbackSentiment = 'Positive' | 'Neutral' | 'Critical';

export interface FeedbackRow {
  id: string;
  memberName: string;
  memberEmail: string;
  initials: string;
  /** Short summary of the comment, or a placeholder when none was left. */
  summary: string;
  /** Feedback category, e.g. "training" / "counselor" / "platform". */
  type: string;
  rating: number;
  sentiment: FeedbackSentiment;
  /** Pre-formatted submitted date, e.g. "Jun 12". */
  submitted: string;
}

export interface FeedbackKitProps {
  feedback: FeedbackRow[];
  /** Total feedback submissions in scope. */
  total: number;
  /** Submissions in the last 7 days (KPI "New"). */
  recent: number;
  /** Submissions rated 1–2 stars (KPI "Critical"). */
  critical: number;
  /** Avg rating caption, e.g. "4.3" or "—". */
  avgRating: string;
}

const SENTIMENT_TONE: Record<FeedbackSentiment, KitTone> = {
  Positive: 'ok',
  Neutral: 'warn',
  Critical: 'alert',
};

const TYPE_TONE: Record<string, KitTone> = {
  training: 'info',
  counselor: 'info',
  platform: 'muted',
  program: 'info',
  general: 'muted',
};

function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function FeedbackKit({
  feedback,
  total,
  recent,
  critical,
  avgRating,
}: FeedbackKitProps) {
  const kpis: KpiItem[] = [
    { label: 'Total', value: total },
    { label: 'New (7d)', value: recent, color: 'info' },
    { label: 'Critical', value: critical, color: 'accent' },
    { label: 'Avg Rating', value: avgRating, color: 'success' },
  ];

  const numStyle = { fontVariantNumeric: 'tabular-nums' as const };

  const MemberCell = ({ row }: { row: FeedbackRow }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <Avatar initials={row.initials} size={32} />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.memberName}
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
          {row.memberEmail}
        </div>
      </div>
    </div>
  );

  const columns: Column<FeedbackRow>[] = [
    { key: 'member', header: 'From', render: (row) => <MemberCell row={row} /> },
    {
      key: 'summary',
      header: 'Feedback',
      render: (row) => (
        <span
          style={{
            display: 'block',
            maxWidth: 360,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'var(--wa-text)',
          }}
        >
          {row.summary}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <StatusTag tone={TYPE_TONE[row.type] ?? 'muted'}>{titleCase(row.type)}</StatusTag>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      align: 'right',
      render: (row) => (
        <span style={{ ...numStyle, fontWeight: 700 }}>{row.rating}/5</span>
      ),
    },
    {
      key: 'sentiment',
      header: 'Status',
      render: (row) => (
        <StatusTag tone={SENTIMENT_TONE[row.sentiment]}>{row.sentiment}</StatusTag>
      ),
    },
    {
      key: 'submitted',
      header: 'Submitted',
      align: 'right',
      render: (row) => (
        <span style={{ ...numStyle, color: 'var(--wa-muted)' }}>{row.submitted}</span>
      ),
    },
  ];

  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <SectionHeader
        title="Feedback"
        kicker="Members"
        goal="Member ratings & comments on training, counselors, and the platform"
      />

      <div className="wa-mb-5">
        <KpiStrip items={kpis} />
      </div>

      <DataTable<FeedbackRow>
        columns={columns}
        rows={feedback}
        rowKey={(row) => row.id}
        minWidth={820}
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
                <MemberCell row={row} />
              </div>
              <div style={{ flexShrink: 0 }}>
                <StatusTag tone={SENTIMENT_TONE[row.sentiment]}>{row.sentiment}</StatusTag>
              </div>
            </div>
            <p
              style={{
                fontSize: 12,
                color: 'var(--wa-text)',
                margin: '10px 0 0',
                lineHeight: 1.5,
              }}
            >
              {row.summary}
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 8,
                fontSize: 11,
                color: 'var(--wa-muted)',
                marginTop: 12,
              }}
            >
              <span>
                <StatusTag tone={TYPE_TONE[row.type] ?? 'muted'}>{titleCase(row.type)}</StatusTag>
              </span>
              <span style={numStyle}>
                <b style={{ color: 'var(--wa-text)' }}>{row.rating}/5</b> · {row.submitted}
              </span>
            </div>
          </div>
        )}
        emptyTitle="No feedback yet"
        emptyDescription="Member feedback on training, counselors, and the platform will appear here."
      />

      <p
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--wa-muted)',
          marginTop: 16,
        }}
      >
        Showing {feedback.length} of {total}
      </p>
    </DesignSurface>
  );
}
