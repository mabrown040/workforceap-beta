'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function OpenEmployerPortalButton({ employerId }: { employerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/employer-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employerId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? 'Could not set employer context');
        return;
      }
      router.push('/employer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" className="btn btn-ghost btn-sm" disabled={loading} onClick={openPortal}>
      {loading ? 'Opening…' : 'Open portal'}
    </button>
  );
}
