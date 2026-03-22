'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function OpenEmployerPortalButton({ employerId }: { employerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/employer-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employerId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === 'string' ? data.error : 'Could not set employer context.');
        return;
      }
      router.push('/employer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-open-portal-wrap">
      <button type="button" className="btn btn-ghost btn-sm" disabled={loading} onClick={openPortal}>
        {loading ? 'Opening…' : 'Open portal'}
      </button>
      {error && (
        <p className="admin-inline-text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
