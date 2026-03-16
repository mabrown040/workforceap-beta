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
  const isCompleted = localCompleted;
  const isSaved = localSaved;

  const recordAction = async (action: 'complete' | 'save') => {
    setLoading(true);
    try {
      await fetch(`/api/member/resources/${resourceId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (action === 'complete') setLocalCompleted(true);
      if (action === 'save') setLocalSaved(true);
      router.refresh();
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
    </div>
  );
}
