'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function OpenPartnerPortalButton({
  partnerId,
  canOpenPortal = true,
  disabledReason,
}: {
  partnerId: string;
  canOpenPortal?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    if (!canOpenPortal) {
      setError(disabledReason ?? 'This partner must be active before you can open the portal preview.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/partner-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === 'string' ? data.error : 'Could not set partner context.');
        return;
      }
      router.push('/partner');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-open-portal-wrap">
      <button
        type="button"
        className="btn btn-outline btn-sm"
        style={{ color: 'var(--color-on-surface)', borderColor: 'var(--outline-variant)' }}
        disabled={loading || !canOpenPortal}
        onClick={openPortal}
        title={!canOpenPortal ? disabledReason : undefined}
      >
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
