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
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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
        setMessage({ type: 'err', text: parts.length > 0 ? parts.join(' — ') : `Update failed (${res.status})` });
        return;
      }
      setMessage({ type: 'ok', text: 'Saved.' });
      router.refresh();
    } catch {
      setMessage({ type: 'err', text: 'Request failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Partner assignment</h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
        Link this member to a partner organization for referral tracking and milestone emails to the partner contact.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <select
          value={partnerId}
          onChange={(e) => setPartnerId(e.target.value)}
          aria-label="Partner organization"
          style={{ padding: '0.5rem', minWidth: 260, borderRadius: 6, border: '1px solid var(--color-border)' }}
        >
          <option value="">No partner</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={loading} aria-busy={loading}>
          <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {loading ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', animation: 'spin 1s linear infinite' }} aria-hidden="true">progress_activity</span>
                Saving…
              </>
            ) : (
              'Save'
            )}
          </span>
        </button>
      </div>
      {message && (
        <p
          role={message.type === 'ok' ? 'status' : 'alert'}
          style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: message.type === 'ok' ? '#166534' : '#b91c1c' }}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
