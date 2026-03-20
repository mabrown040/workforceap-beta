'use client';

import { useState } from 'react';

export default function InvitePartnerUserButton({ partnerId }: { partnerId: string }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'err', text: typeof data.error === 'string' ? data.error : 'Invite failed' });
        return;
      }
      setMessage({ type: 'ok', text: 'Invite sent. They will receive an email to access the partner portal.' });
      setEmail('');
    } catch {
      setMessage({ type: 'err', text: 'Request failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
      <input
        type="email"
        required
        placeholder="partner@organization.org"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ padding: '0.5rem 0.75rem', minWidth: 220, borderRadius: 6, border: '1px solid var(--color-border)' }}
      />
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Sending…' : 'Invite Partner User'}
      </button>
      {message && (
        <span style={{ fontSize: '0.85rem', color: message.type === 'ok' ? '#2d7a32' : '#c00', width: '100%' }}>
          {message.text}
        </span>
      )}
    </form>
  );
}
