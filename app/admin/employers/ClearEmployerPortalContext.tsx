'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ClearEmployerPortalContext() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function clear() {
    setLoading(true);
    try {
      await fetch('/api/admin/employer-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employerId: null }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-outline btn-sm"
      style={{ color: 'var(--color-on-surface)', borderColor: 'var(--outline-variant)' }}
      disabled={loading}
      onClick={clear}
    >
      {loading ? 'Clearing…' : 'Clear portal cookie'}
    </button>
  );
}
