'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type SubgroupOpt = { id: string; name: string };
type ProgramOpt = { slug: string; title: string };

type Props = {
  subgroups: SubgroupOpt[];
  programs: ProgramOpt[];
  onClose: () => void;
};

export default function InviteForm({ subgroups, programs, onClose }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'partner' | 'member'>('member');
  const [subgroupId, setSubgroupId] = useState('');
  const [programSlug, setProgramSlug] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          role,
          subgroupId: role === 'partner' && subgroupId ? subgroupId : null,
          programSlug: role === 'member' && programSlug ? programSlug : null,
          personalMessage: personalMessage.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to send invite');
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSending(false);
    }
  };

  const inputStyle = {
    width: '100%',
    maxWidth: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '6px',
    fontSize: '1rem',
  } as const;
  const labelStyle = { display: 'block', marginBottom: '0.25rem', fontWeight: 500 } as const;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          maxWidth: '480px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '1.5rem' }}>
          <h2 id="invite-modal-title" style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>
            Send Invite
          </h2>

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
              <label htmlFor="invite-email" style={labelStyle}>
                Email address
              </label>
              <input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="invite-role" style={labelStyle}>
                Role
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as 'admin' | 'partner' | 'member');
                  setSubgroupId('');
                  setProgramSlug('');
                }}
                style={inputStyle}
              >
                <option value="admin">Admin</option>
                <option value="partner">Partner</option>
                <option value="member">Student</option>
              </select>
            </div>

            {role === 'partner' && subgroups.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="invite-subgroup" style={labelStyle}>
                  Subgroup (optional)
                </label>
                <select
                  id="invite-subgroup"
                  value={subgroupId}
                  onChange={(e) => setSubgroupId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">None</option>
                  {subgroups.map((sg) => (
                    <option key={sg.id} value={sg.id}>
                      {sg.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {role === 'member' && programs.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="invite-program" style={labelStyle}>
                  Program pre-assignment (optional)
                </label>
                <select
                  id="invite-program"
                  value={programSlug}
                  onChange={(e) => setProgramSlug(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">None</option>
                  {programs.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="invite-message" style={labelStyle}>
                Personal message (optional)
              </label>
              <textarea
                id="invite-message"
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                placeholder="Add a personal note to the invitation..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} className="btn btn-outline">
                Cancel
              </button>
              <button type="submit" disabled={sending} className="btn btn-primary">
                {sending ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
