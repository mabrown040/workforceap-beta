'use client';

import { useState } from 'react';

interface TierCheckoutFormProps {
  tierKey: string;
  currentTierKey: string;
  upgradeLabel: string;
  downgradeLabel: string;
  switchLabel: string;
}

export default function TierCheckoutForm({
  tierKey,
  currentTierKey,
  upgradeLabel,
  downgradeLabel,
  switchLabel,
}: TierCheckoutFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/employer/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierKey }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  let label = switchLabel;
  if (currentTierKey === 'basic') label = upgradeLabel;
  else if (tierKey === 'basic') label = downgradeLabel;

  return (
    <form onSubmit={handleSubmit}>
      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%' }}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? 'Processing…' : label}
      </button>
      {error ? (
        <p role="alert" style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-error, #dc2626)' }}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
