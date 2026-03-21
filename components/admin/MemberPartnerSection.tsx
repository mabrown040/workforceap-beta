'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type PartnerOpt = { id: string; name: string };

export default function MemberPartnerSection({
  memberId,
  partners,
  currentPartnerId,
}: {
  memberId: string;
  partners: PartnerOpt[];
  currentPartnerId: string | null;
}) {
  const router = useRouter();
  const [partnerId, setPartnerId] = useState<string>(currentPartnerId ?? '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setPartnerId(currentPartnerId ?? '');
  }, [currentPartnerId]);

  async function save() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/members/${memberId}/partner`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId: partnerId || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const parts = [
          typeof data.error === 'string' ? data.error : null,
          typeof data.detail === 'string' ? data.detail : null,
        ].filter(Boolean) as string[];
        setMessage(parts.length > 0 ? parts.join(' — ') : `Update failed (${res.status})`);
        return;
      }
      setMessage('Saved.');
      router.refresh();
    } catch {
      setMessage('Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Partner assignment</h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', marginBottom: '0.75rem' }}>
        Link this member to a partner organization for referral tracking and milestone emails to the partner contact.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <select
          value={partnerId}
          onChange={(e) => setPartnerId(e.target.value)}
          style={{ padding: '0.5rem', minWidth: 260, borderRadius: 6, border: '1px solid var(--color-border)' }}
        >
          <option value="">No partner</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={loading}>
          {loading ? 'Saving…' : 'Save'}
        </button>
      </div>
      {message && <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--color-gray-600)' }}>{message}</p>}
    </section>
  );
}
