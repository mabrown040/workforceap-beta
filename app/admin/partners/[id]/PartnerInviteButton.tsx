'use client';

import { useState } from 'react';

export default function PartnerInviteButton({ partnerEmail, partnerName }: { partnerEmail: string; partnerName: string }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleInvite = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/admin/partners/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: partnerEmail, name: partnerName }),
      });
      if (res.ok) setSent(true);
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      onClick={handleInvite}
      disabled={sending || sent}
      style={{
        padding: '0.5rem 1rem',
        background: sent ? 'var(--color-green, #4a9b4f)' : 'var(--color-accent)',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: sent ? 'default' : 'pointer',
        fontWeight: 600,
        fontSize: '0.9rem',
      }}
    >
      {sent ? 'Invite Sent' : sending ? 'Sending...' : 'Invite Partner User'}
    </button>
  );
}
