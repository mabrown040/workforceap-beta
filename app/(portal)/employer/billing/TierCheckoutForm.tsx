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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/employer/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierKey }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Something went wrong');
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
      >
        {loading ? '...' : label}
      </button>
    </form>
  );
}
