'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Invite = {
  id: string;
  email: string;
  role: string;
  status: string;
  personalMessage: string | null;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  invitedBy: { id: string; fullName: string; email: string };
  subgroup: { id: string; name: string } | null;
};

type Props = {
  invites: Invite[];
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  partner: 'Partner',
  member: 'Student',
};

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  pending: { bg: 'var(--color-gray-100)', color: 'var(--color-gray-700)' },
  accepted: { bg: 'var(--color-gray-100)', color: 'var(--color-green)' },
  expired: { bg: 'var(--color-gray-100)', color: 'var(--color-gray-500)' },
  revoked: { bg: 'var(--color-gray-100)', color: 'var(--color-gray-500)' },
};

export default function InvitesTable({ invites }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>('all');
  const [resending, setResending] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const filtered = invites.filter((i) => filter === 'all' || i.status === filter);

  const handleResend = async (id: string) => {
    setResending(id);
    try {
      const res = await fetch(`/api/admin/invites/${id}/resend`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to resend');
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to resend');
    } finally {
      setResending(null);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    setRevoking(id);
    try {
      const res = await fetch(`/api/admin/invites/${id}/revoke`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to revoke');
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to revoke');
    } finally {
      setRevoking(null);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['all', 'pending', 'accepted', 'expired', 'revoked'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--color-gray-300)',
              background: filter === s ? 'var(--color-accent)' : 'white',
              color: filter === s ? 'white' : 'inherit',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty-state">
          <h3>No invitations</h3>
          <p>
            {filter === 'all'
              ? 'Send invites to add admins, partners, or students to the platform.'
              : `No ${filter} invitations.`}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Invited By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const statusStyle = STATUS_STYLES[inv.status] ?? STATUS_STYLES.pending;
                return (
                  <tr key={inv.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{inv.email}</div>
                      {inv.subgroup && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>
                          Subgroup: {inv.subgroup.name}
                        </div>
                      )}
                    </td>
                    <td>{ROLE_LABELS[inv.role] ?? inv.role}</td>
                    <td>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          textTransform: 'capitalize',
                          background: statusStyle.bg,
                          color: statusStyle.color,
                        }}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.9rem' }}>{inv.invitedBy.fullName}</td>
                    <td style={{ fontSize: '0.9rem' }}>
                      {inv.status === 'accepted' && inv.acceptedAt
                        ? formatDate(inv.acceptedAt)
                        : formatDate(inv.createdAt)}
                    </td>
                    <td>
                      {inv.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleResend(inv.id)}
                            disabled={!!resending}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.85rem',
                              color: 'var(--color-accent)',
                              background: 'none',
                              border: 'none',
                              cursor: resending ? 'wait' : 'pointer',
                              textDecoration: 'underline',
                            }}
                          >
                            {resending === inv.id ? 'Resending...' : 'Resend'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevoke(inv.id)}
                            disabled={!!revoking}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.85rem',
                              color: 'var(--color-gray-600)',
                              background: 'none',
                              border: 'none',
                              cursor: revoking ? 'wait' : 'pointer',
                              textDecoration: 'underline',
                            }}
                          >
                            {revoking === inv.id ? 'Revoking...' : 'Revoke'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
