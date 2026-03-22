'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

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

  return (
    <Card className="ui-form-card" variant="bordered">
      <form onSubmit={handleSubmit} className="ui-form ui-form--narrow">
        {error ? (
          <Alert tone="error" role="alert" title="Could not save subgroup">
            {error}
          </Alert>
        ) : null}

        <div className="form-group">
          <label htmlFor="subgroup-name">Name *</label>
          <input
            id="subgroup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Oak Hill Church, Workforce Solutions Central"
            disabled={saving}
          />
        </div>

        <div className="form-group">
          <label htmlFor="subgroup-type">Type *</label>
          <select
            id="subgroup-type"
            value={type}
            onChange={(e) => setType(e.target.value as 'partner' | 'manager' | 'church')}
            disabled={saving}
          >
            <option value="partner">Partner</option>
            <option value="manager">Manager</option>
            <option value="church">Church</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="subgroup-leader">Leader *</label>
          <select
            id="subgroup-leader"
            value={leaderId}
            onChange={(e) => setLeaderId(e.target.value)}
            required
            disabled={saving}
          >
            <option value="">Select leader</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.email})
              </option>
            ))}
          </select>
          <p className="form-hint">The leader can view this subgroup&apos;s members in the portal.</p>
        </div>

        {type === 'partner' ? (
          <div className="form-group">
            <label htmlFor="subgroup-partner">Linked Partner (optional)</label>
            <select
              id="subgroup-partner"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              disabled={saving}
            >
              <option value="">No partner</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="form-hint">
              Link to a partner for auto-assignment when members are referred by that partner.
            </p>
          </div>
        ) : null}

        <div className="form-group">
          <label htmlFor="subgroup-description">Description (optional)</label>
          <textarea
            id="subgroup-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief description of this subgroup"
            disabled={saving}
          />
        </div>

        <div className="ui-form-actions">
          <Button type="submit" disabled={saving} loading={saving}>
            {subgroup ? 'Update' : 'Create'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
