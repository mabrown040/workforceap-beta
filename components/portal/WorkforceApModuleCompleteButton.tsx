'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WorkforceApModuleCompleteButton({
  courseSlug,
  programSlug,
  completed,
}: {
  courseSlug: string;
  programSlug: string;
  completed: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (completed) {
    return <span className="btn btn-outline" role="status">Completed</span>;
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
        className="btn btn-primary"
        onClick={complete}
        disabled={saving}
        aria-busy={saving}
      >
        {saving ? 'Saving…' : 'Mark lab complete'}
      </button>
      {error ? <p role="alert" style={{ marginTop: 8, color: 'var(--color-error)' }}>{error}</p> : null}
    </div>
  );
}
