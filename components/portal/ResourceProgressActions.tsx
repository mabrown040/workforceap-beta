'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  resourceId: string;
  progress: { completedAt: string | Date | null; savedAt: string | Date | null } | null;
};

export default function ResourceProgressActions({ resourceId, progress }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [localCompleted, setLocalCompleted] = useState(!!progress?.completedAt);
  const [localSaved, setLocalSaved] = useState(!!progress?.savedAt);
  const [error, setError] = useState<string | null>(null);
  const isCompleted = localCompleted;
  const isSaved = localSaved;

  const recordAction = async (action: 'complete' | 'save') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/member/resources/${resourceId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      // The button previously flipped to "done" regardless of whether the
      // server accepted the update — a failed request looked identical to a
      // successful one. Only reflect success in the UI, and surface a way
      // to retry otherwise.
      if (!res.ok) throw new Error('Request failed');
      if (action === 'complete') setLocalCompleted(true);
      if (action === 'save') setLocalSaved(true);
      router.refresh();
    } catch {
      setError(
        action === 'complete'
          ? "Couldn't mark this resource complete — try again."
          : "Couldn't save this resource for later — try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="resource-progress-actions">
      <button
        type="button"
        className={`btn btn-sm ${isCompleted ? 'btn-outline' : 'btn-primary'}`}
        onClick={() => recordAction('complete')}
        disabled={loading}
      >
        {isCompleted ? '✓ Completed' : 'Mark as complete'}
      </button>
      <button
        type="button"
        className={`btn btn-outline btn-sm ${isSaved ? 'saved' : ''}`}
        onClick={() => recordAction('save')}
        disabled={loading}
      >
        {isSaved ? '✓ Saved for later' : 'Save for later'}
      </button>
      {/* flexBasis forces this onto its own row within the parent's
          `display: flex; flex-wrap: wrap` (css/portal-main-extracted.css
          .resource-progress-actions) instead of squeezing in beside the buttons. */}
      {error && (
        <p role="alert" style={{ margin: 0, flexBasis: '100%', fontSize: '0.8125rem', color: 'var(--color-error, #dc2626)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
