'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';

export default function EmployerStatusButton({
  employerId,
  active,
}: {
  employerId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(nextAction: 'deactivate' | 'reactivate') {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/employers/${employerId}/${nextAction}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : `Failed to ${nextAction} employer`);
        return;
      }
      router.refresh();
    } catch {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-open-portal-wrap">
      <button
        type="button"
        className="btn btn-outline btn-sm"
        disabled={loading}
        onClick={() => void updateStatus(active ? 'deactivate' : 'reactivate')}
        title={active ? 'Deactivate employer' : 'Reactivate employer'}
      >
        {active ? <Trash2 size={14} aria-hidden /> : <RotateCcw size={14} aria-hidden />}
        <span style={{ marginLeft: '0.35rem' }}>{loading ? (active ? 'Deactivating…' : 'Reactivating…') : active ? 'Deactivate' : 'Reactivate'}</span>
      </button>
      {error ? (
        <p className="admin-inline-text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
