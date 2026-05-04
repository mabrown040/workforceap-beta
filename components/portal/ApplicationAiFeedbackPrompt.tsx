'use client';

import { useState } from 'react';
import type { ApplicationAiFeedbackHowUsed } from '@prisma/client';
import { formatFeedbackPromptDate } from '@/lib/member/applicationAiFeedback';

export type RecentToolOption = { id: string; label: string; createdAt: string };

type Props = {
  jobApplicationId: string;
  recentTools: RecentToolOption[];
  onDone: () => void;
  onSkip?: () => void;
};

export default function ApplicationAiFeedbackPrompt({ jobApplicationId, recentTools, onDone, onSkip }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [primaryId, setPrimaryId] = useState<string | null>(recentTools[0]?.id ?? null);

  const submit = async (howUsed: ApplicationAiFeedbackHowUsed) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/member/application-ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobApplicationId,
          howUsed,
          primaryAiToolResultId: howUsed === 'SKIPPED' ? null : primaryId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not save');
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-feedback-title"
      style={{
        marginTop: '1rem',
        padding: '1rem',
        borderRadius: '0.75rem',
        border: '1px solid var(--outline-variant)',
        background: 'var(--surface-container-lowest)',
      }}
    >
      <h3 id="ai-feedback-title" style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
        Quick check-in
      </h3>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
        You recently used our AI tools ({recentTools.map((t) => `${t.label} (${formatFeedbackPromptDate(new Date(t.createdAt))})`).join('; ')}
        ). When you applied, did you use what you built in those tools?
      </p>
      {recentTools.length > 1 ? (
        <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
          <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Which result did you lean on most?</span>
          <select
            value={primaryId ?? ''}
            onChange={(e) => setPrimaryId(e.target.value || null)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem' }}
          >
            {recentTools.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} — {formatFeedbackPromptDate(new Date(t.createdAt))}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {error ? (
        <p role="alert" style={{ color: 'var(--color-error, #b3261e)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          {error}
        </p>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button type="button" className="btn btn-primary btn-small" disabled={submitting} onClick={() => submit('YES')}>
          Yes, used it
        </button>
        <button type="button" className="btn btn-outline btn-small" disabled={submitting} onClick={() => submit('ADJUSTED')}>
          I adjusted it
        </button>
        <button type="button" className="btn btn-outline btn-small" disabled={submitting} onClick={() => submit('NO')}>
          No, not this time
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          disabled={submitting}
          onClick={() => {
            void submit('SKIPPED');
            onSkip?.();
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
