'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RotateCcw, Trash2, CheckCircle, XCircle } from 'lucide-react';

type EmployerStatus = 'active' | 'inactive' | 'pending_approval';

export default function EmployerStatusButton({
  employerId,
  status,
}: {
  employerId: string;
  status: EmployerStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(nextAction: 'deactivate' | 'reactivate' | 'approve' | 'reject') {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/employers/${employerId}/${nextAction}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
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

  if (status === 'pending_approval') {
    return (
      <div className="admin-open-portal-wrap" style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          className="btn btn-sm"
          style={{ background: '#2d7a32', color: '#fff', border: 'none' }}
          disabled={loading}
          onClick={() => void updateStatus('approve')}
          title="Approve employer"
        >
          <CheckCircle size={14} aria-hidden />
          <span style={{ marginLeft: '0.35rem' }}>{loading ? 'Approving…' : 'Approve'}</span>
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={loading}
          onClick={() => void updateStatus('reject')}
          title="Reject employer"
        >
          <XCircle size={14} aria-hidden />
          <span style={{ marginLeft: '0.35rem' }}>{loading ? 'Rejecting…' : 'Reject'}</span>
        </button>
        {error ? (
          <p className="admin-inline-text-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const active = status === 'active';

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
