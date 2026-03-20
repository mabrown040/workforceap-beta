'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type UserOpt = { id: string; fullName: string; email: string };
type PartnerOpt = { id: string; name: string };

type Props = {
  users: UserOpt[];
  partners: PartnerOpt[];
  subgroup?: {
    id: string;
    name: string;
    type: string;
    leaderId: string;
    partnerId: string | null;
    description: string | null;
  };
};

export default function SubgroupForm({ users, partners, subgroup }: Props) {
  const router = useRouter();
  const [name, setName] = useState(subgroup?.name ?? '');
  const [type, setType] = useState<'partner' | 'manager' | 'church'>(subgroup?.type as 'partner' | 'manager' | 'church' ?? 'partner');
  const [leaderId, setLeaderId] = useState(subgroup?.leaderId ?? '');
  const [partnerId, setPartnerId] = useState(subgroup?.partnerId ?? '');
  const [description, setDescription] = useState(subgroup?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = subgroup
        ? await fetch(`/api/admin/subgroups/${subgroup.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim(),
              type,
              leaderId,
              partnerId: type === 'partner' ? (partnerId || null) : null,
              description: description.trim() || null,
            }),
          })
        : await fetch('/api/admin/subgroups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim(),
              type,
              leaderId,
              partnerId: type === 'partner' ? (partnerId || null) : null,
              description: description.trim() || null,
            }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      router.push(subgroup ? `/admin/subgroups/${subgroup.id}` : `/admin/subgroups/${data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', maxWidth: '480px', padding: '0.5rem 0.75rem', border: '1px solid #ccc', borderRadius: '6px', fontSize: '1rem' } as const;
  const labelStyle = { display: 'block', marginBottom: '0.25rem', fontWeight: 500 } as const;

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '560px' }}>
      {error && (
        <div style={{ padding: '0.75rem', marginBottom: '1rem', background: '#fee', borderRadius: '6px', color: '#c00' }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={inputStyle}
          placeholder="e.g. Oak Hill Church, Workforce Solutions Central"
          disabled={saving}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Type *</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'partner' | 'manager' | 'church')}
          style={inputStyle}
          disabled={saving}
        >
          <option value="partner">Partner</option>
          <option value="manager">Manager</option>
          <option value="church">Church</option>
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Leader *</label>
        <select
          value={leaderId}
          onChange={(e) => setLeaderId(e.target.value)}
          required
          style={inputStyle}
          disabled={saving}
        >
          <option value="">Select leader</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName} ({u.email})
            </option>
          ))}
        </select>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: '0.25rem' }}>
          The leader can view this subgroup&apos;s members in the portal.
        </p>
      </div>

      {type === 'partner' && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Linked Partner (optional)</label>
          <select
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            style={inputStyle}
            disabled={saving}
          >
            <option value="">No partner</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: '0.25rem' }}>
            Link to a partner for auto-assignment when members are referred by that partner.
          </p>
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={labelStyle}>Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          style={{ ...inputStyle, maxWidth: '100%' }}
          placeholder="Brief description of this subgroup"
          disabled={saving}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : subgroup ? 'Update' : 'Create'}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => router.back()} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
