'use client';

import { useMemo } from 'react';
import StatusBadge from '@/components/portal/StatusBadge';
import { formatPortalDate, formatPortalDateTime } from '@/lib/formatDate';
import type { ActionDraft } from '@/lib/milestoneCascade/types';

/**
 * Wire-shape of a cascade for the inbox client. Mirrors `CascadeCardData`
 * from lib/milestoneCascade/queries.ts but with Dates serialized as strings
 * (the page passes data through `JSON.parse(JSON.stringify(...))`).
 */
export interface CascadeCardWire {
  id: string;
  userId: string;
  userFullName: string | null;
  userEmail: string;
  milestoneType: string;
  milestoneRef: string;
  programSlug: string | null;
  counselorBrief: string | null;
  drafts: ActionDraft[];
  invalidDraftCount: number;
  draftModel: string | null;
  draftPromptVersion: string | null;
  draftedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

function hoursUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.round(ms / (60 * 60 * 1000)));
}

function formatExpiry(iso: string): string {
  const hrs = hoursUntil(iso);
  if (hrs === 0) return 'expires soon';
  if (hrs < 24) return `expires in ${hrs}h`;
  const days = Math.floor(hrs / 24);
  const rem = hrs % 24;
  return rem === 0 ? `expires in ${days}d` : `expires in ${days}d ${rem}h`;
}

const ACTION_TYPE_LABELS: Record<ActionDraft['type'], string> = {
  celebrate_milestone: '📧 Celebration email',
  suggest_next_course: '📚 Next-course suggestion',
  request_peer_pair: '🤝 Peer-pair suggestion',
  flag_for_counselor_call: '☎️ Flag for counselor call',
};

export function AgentInboxClient({ cascades }: { cascades: CascadeCardWire[] }) {
  if (cascades.length === 0) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--color-on-surface-variant)',
          border: '1px dashed var(--outline-variant)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <p style={{ margin: 0 }}>The queue is empty.</p>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
          Cascades will appear here automatically when learners hit milestones
          and the drafting cron produces a counselor-reviewable draft.
        </p>
      </div>
    );
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {cascades.map((c) => (
        <CascadeCard key={c.id} cascade={c} />
      ))}
    </ul>
  );
}

function CascadeCard({ cascade }: { cascade: CascadeCardWire }) {
  const expires = useMemo(() => formatExpiry(cascade.expiresAt), [cascade.expiresAt]);
  const learnerLabel = cascade.userFullName ?? cascade.userEmail;

  return (
    <li
      style={{
        marginBottom: '1.25rem',
        padding: '1rem 1.25rem',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-container-lowest)',
      }}
    >
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.5rem',
        }}
      >
        <strong style={{ fontSize: '1rem' }}>{learnerLabel}</strong>
        <StatusBadge label="awaiting review" variant="warning" />
        <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
          {cascade.milestoneType.replaceAll('_', ' ')}
          {cascade.milestoneRef ? ` · ${cascade.milestoneRef}` : ''}
        </span>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginLeft: 'auto' }}>
          {expires}
        </span>
      </header>

      {cascade.counselorBrief && (
        <p
          style={{
            margin: '0 0 0.85rem',
            padding: '0.5rem 0.75rem',
            background: 'var(--surface-container-low)',
            borderLeft: '3px solid var(--color-accent)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.95rem',
          }}
        >
          {cascade.counselorBrief}
        </p>
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {cascade.drafts.map((draft, i) => (
          <DraftRow key={i} draft={draft} />
        ))}
      </ul>

      <footer
        style={{
          marginTop: '0.85rem',
          paddingTop: '0.6rem',
          borderTop: '1px solid var(--outline-variant)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.78rem',
          color: 'var(--color-on-surface-variant)',
        }}
      >
        <span>Detected {formatPortalDate(cascade.createdAt)}</span>
        {cascade.draftedAt && <span>Drafted {formatPortalDateTime(cascade.draftedAt)}</span>}
        {cascade.draftModel && <span>Model: {cascade.draftModel}</span>}
        {cascade.draftPromptVersion && <span>Prompt: {cascade.draftPromptVersion}</span>}
        {cascade.invalidDraftCount > 0 && (
          <span style={{ color: 'var(--color-error, #b00020)' }}>
            {cascade.invalidDraftCount} draft{cascade.invalidDraftCount === 1 ? '' : 's'} skipped (schema mismatch)
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
          Approve / Dismiss controls land in the next deploy.
        </span>
      </footer>
    </li>
  );
}

function DraftRow({ draft }: { draft: ActionDraft }) {
  return (
    <li
      style={{
        marginBottom: '0.6rem',
        padding: '0.75rem 0.85rem',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--surface-container)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: '0.5rem',
          marginBottom: '0.35rem',
        }}
      >
        <strong style={{ fontSize: '0.92rem' }}>{ACTION_TYPE_LABELS[draft.type]}</strong>
        <span style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>
          confidence {(draft.confidence * 100).toFixed(0)}%
        </span>
      </div>

      {draft.type === 'celebrate_milestone' && (
        <>
          <p style={{ margin: '0 0 0.25rem', fontWeight: 500, fontSize: '0.92rem' }}>
            Subject: {draft.subject}
          </p>
          <pre
            style={{
              margin: 0,
              padding: '0.5rem',
              background: 'var(--surface-container-lowest)',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
            }}
          >
            {draft.body}
          </pre>
        </>
      )}

      {draft.type === 'suggest_next_course' && (
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          Suggested course slug: <code>{draft.courseSlug}</code>
        </p>
      )}

      <p
        style={{
          margin: '0.35rem 0 0',
          fontSize: '0.83rem',
          color: 'var(--color-on-surface-variant)',
          fontStyle: 'italic',
        }}
      >
        {draft.rationale}
      </p>
    </li>
  );
}
