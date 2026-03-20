'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

export type PartnerForEdit = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  active: boolean;
  notes: string | null;
  subgroups?: { id: string; name: string }[];
};

type SubgroupOpt = { id: string; name: string; type: string; partnerId: string | null };

type Props = {
  partner: PartnerForEdit;
  subgroups: SubgroupOpt[];
  onClose: () => void;
};

export default function PartnerEditModal({ partner, subgroups, onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState(partner.name);
  const [contactName, setContactName] = useState(partner.contactName ?? '');
  const [contactEmail, setContactEmail] = useState(partner.contactEmail ?? '');
  const [contactPhone, setContactPhone] = useState(partner.contactPhone ?? '');
  const [active, setActive] = useState(partner.active);
  const [notes, setNotes] = useState(partner.notes ?? '');
  const [subgroupIds, setSubgroupIds] = useState<string[]>(() =>
    subgroups.filter((s) => s.type === 'partner' && s.partnerId === partner.id).map((s) => s.id)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ids = subgroups.filter((s) => s.type === 'partner' && s.partnerId === partner.id).map((s) => s.id);
    setSubgroupIds(ids);
  }, [partner.id, subgroups]);

  const partnerSubgroups = subgroups.filter((s) => s.type === 'partner');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          contactName: contactName.trim() || null,
          contactEmail: contactEmail.trim() || null,
          contactPhone: contactPhone.trim() || null,
          active,
          notes: notes.trim() || null,
          subgroupIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to save');
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError('Request failed');
    } finally {
      setSaving(false);
    }
  }

  function toggleSubgroup(id: string) {
    setSubgroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="partner-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="partner-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="partner-edit-title"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 id="partner-edit-title" style={{ margin: 0, fontSize: '1.25rem' }}>
            Edit Partner
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: 'var(--color-gray-600)' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
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

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.9rem' }}>
              Organization Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--color-gray-300)', borderRadius: '6px' }}
              disabled={saving}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.9rem' }}>
              Contact Name
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--color-gray-300)', borderRadius: '6px' }}
              disabled={saving}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.9rem' }}>
              Contact Email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--color-gray-300)', borderRadius: '6px' }}
              disabled={saving}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.9rem' }}>
              Phone
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--color-gray-300)', borderRadius: '6px' }}
              disabled={saving}
            />
          </div>

          {partnerSubgroups.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.9rem' }}>
                Subgroup assignment
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 140, overflowY: 'auto', padding: '0.5rem', border: '1px solid var(--color-gray-200)', borderRadius: '6px' }}>
                {partnerSubgroups.map((s) => (
                  <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={subgroupIds.includes(s.id)}
                      onChange={() => toggleSubgroup(s.id)}
                      disabled={saving}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                disabled={saving}
              />
              Active (partner can access portal)
            </label>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.9rem' }}>
              Internal Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Admin-only notes about this partner"
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--color-gray-300)', borderRadius: '6px', resize: 'vertical' }}
              disabled={saving}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{ padding: '0.5rem 1rem', background: 'var(--color-gray-100)', border: '1px solid var(--color-gray-300)', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ padding: '0.5rem 1.25rem', background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
