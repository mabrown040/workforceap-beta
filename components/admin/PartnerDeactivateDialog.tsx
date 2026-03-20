'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

type Props = {
  partner: { id: string; name: string; _count?: { referrals: number } };
  partners: { id: string; name: string; active: boolean }[];
  onClose: () => void;
};

export default function PartnerDeactivateDialog({ partner, partners, onClose }: Props) {
  const router = useRouter();
  const [reassignToPartnerId, setReassignToPartnerId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePartners = partners.filter((p) => p.active && p.id !== partner.id);
  const referralCount = partner._count?.referrals ?? 0;

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reassignToPartnerId: reassignToPartnerId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to deactivate');
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="partner-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="partner-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deactivate-title"
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ color: 'var(--color-accent)', flexShrink: 0 }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h2 id="deactivate-title" style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>
              Deactivate Partner
            </h2>
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-gray-600)', lineHeight: 1.5 }}>
              This will prevent <strong>{partner.name}</strong> from accessing the partner portal. Their data will be preserved.
            </p>
          </div>
        </div>

        {referralCount > 0 && activePartners.length > 0 && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--color-light)', borderRadius: '6px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>
              Reassign their {referralCount} referred member{referralCount !== 1 ? 's' : ''} to another partner
            </label>
            <select
              value={reassignToPartnerId}
              onChange={(e) => setReassignToPartnerId(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--color-gray-300)', borderRadius: '6px' }}
              disabled={loading}
            >
              <option value="">— Don&apos;t reassign —</option>
              {activePartners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              background: '#fee',
              borderRadius: '6px',
              color: '#c00',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{ padding: '0.5rem 1rem', background: 'var(--color-gray-100)', border: '1px solid var(--color-gray-300)', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={loading}
            style={{ padding: '0.5rem 1.25rem', background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Deactivating…' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  );
}
