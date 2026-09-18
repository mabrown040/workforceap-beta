'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WorkforceApModuleCompleteButton({
  courseSlug,
  programSlug,
  completed,
  appearance = 'primary',
  label = 'Mark lab complete',
  completedLabel = 'Completed',
}: {
  courseSlug: string;
  programSlug: string;
  completed: boolean;
  /** Lesson modules use secondary so Mark complete cannot outrank Start this lesson. */
  appearance?: 'primary' | 'secondary';
  label?: string;
  completedLabel?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSecondary = appearance === 'secondary';
  const idleClassName = isSecondary
    ? 'wa-kit-cta wa-kit-cta--ghost wa-kit-focus'
    : 'btn btn-primary';
  const doneClassName = isSecondary ? 'wa-kit-cta wa-kit-cta--ghost' : 'btn btn-outline';

  if (completed) {
    return <span className={doneClassName} role="status">{completedLabel}</span>;
  }

  const complete = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/member/courses/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseSlug, programSlug }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? 'Could not save completion. Please try again.');
        return;
      }
      router.refresh();
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        className={idleClassName}
        onClick={complete}
        disabled={saving}
        aria-busy={saving}
      >
        {saving ? 'Saving…' : label}
      </button>
      {error ? <p role="alert" style={{ marginTop: 8, color: 'var(--color-error)' }}>{error}</p> : null}
    </div>
  );
}
