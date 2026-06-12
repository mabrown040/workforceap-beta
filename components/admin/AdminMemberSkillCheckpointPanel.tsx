'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SkillCheckpointSummary } from '@/lib/member/skillCheckpoints';

export default function AdminMemberSkillCheckpointPanel({
  memberId,
  summary,
}: {
  memberId: string;
  summary: SkillCheckpointSummary | null;
}) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  if (!summary || summary.totalCount === 0) return null;

  async function submitDecision(checkpointKey: string, decision: 'passed' | 'needs_retry') {
    if (!summary) return;
    setPendingKey(checkpointKey);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/members/${encodeURIComponent(memberId)}/skill-checkpoints`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkpointKey,
            decision,
            programSlug: summary.programSlug,
            notes: draftNotes[checkpointKey] ?? '',
          }),
        },
      );

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? 'Could not save checkpoint decision.');
        return;
      }

      router.refresh();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ marginBottom: '0.9rem' }}>
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 0.35rem' }}>Skill checkpoints</h2>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-on-surface-variant)' }}>
          Mark milestone proof for {summary.programTitle ?? 'this program'} without waiting for a separate certification.
        </p>
      </div>

      {summary.demonstratedSkillLabels.length > 0 ? (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ margin: '0 0 0.35rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Demonstrated now
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {summary.demonstratedSkillLabels.slice(0, 10).map((skill) => (
              <span
                key={skill}
                style={{
                  padding: '0.15rem 0.45rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: 'rgba(74,155,79,0.1)',
                  color: '#256b2a',
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: '0.85rem' }}>
        {summary.checkpoints.map((checkpoint) => {
          const isPending = pendingKey === checkpoint.key;
          return (
            <article
              key={checkpoint.key}
              style={{
                borderRadius: '0.75rem',
                border: '1px solid var(--outline-variant)',
                background: 'var(--color-surface)',
                padding: '0.95rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem' }}>{checkpoint.title}</h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--color-on-surface-variant)' }}>
                    {checkpoint.milestoneLabel}
                  </p>
                </div>
                <strong style={{ fontSize: '0.8rem' }}>{checkpoint.status.replace('_', ' ')}</strong>
              </div>

              <p style={{ margin: '0.65rem 0 0.45rem', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {checkpoint.scenarioPrompt}
              </p>

              {checkpoint.skillLabels.length > 0 ? (
                <p style={{ margin: '0 0 0.6rem', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                  Skills: {checkpoint.skillLabels.slice(0, 5).join(', ')}
                </p>
              ) : null}

              <textarea
                value={draftNotes[checkpoint.key] ?? checkpoint.latestNotes ?? ''}
                onChange={(event) =>
                  setDraftNotes((current) => ({
                    ...current,
                    [checkpoint.key]: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Add proof notes or remediation guidance"
                style={{
                  width: '100%',
                  borderRadius: '0.6rem',
                  border: '1px solid var(--outline-variant)',
                  padding: '0.7rem 0.75rem',
                  font: 'inherit',
                  resize: 'vertical',
                  marginBottom: '0.6rem',
                }}
              />

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!checkpoint.unlocked || isPending}
                  onClick={() => submitDecision(checkpoint.key, 'passed')}
                >
                  {isPending ? 'Saving…' : 'Mark passed'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={!checkpoint.unlocked || isPending}
                  onClick={() => submitDecision(checkpoint.key, 'needs_retry')}
                >
                  Needs retry
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {error ? (
        <p role="alert" style={{ margin: '0.75rem 0 0', color: 'var(--color-error, #c83232)' }}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
