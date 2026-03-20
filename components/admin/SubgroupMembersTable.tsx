'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Member = {
  id: string;
  fullName: string;
  email: string;
  enrolledProgram: string | null;
  enrolledAt: Date | null;
  progressPct: number;
  stage: string;
  assignedAt: Date;
  assignmentType: string;
  assignedBy: string | null | undefined;
};

type Props = {
  subgroupId: string;
  members: Member[];
};

export default function SubgroupMembersTable({ subgroupId, members }: Props) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; fullName: string; email: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const memberIds = new Set(members.map((m) => m.id));

  async function doSearch() {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/members?q=${encodeURIComponent(search.trim())}&limit=20`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setSearchResults(data.filter((m: { id: string }) => !memberIds.has(m.id)));
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function addMember(memberId: string) {
    setAdding(memberId);
    try {
      const res = await fetch(`/api/admin/members/${memberId}/subgroup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subgroupId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed');
      }
      router.refresh();
      setShowAddModal(false);
      setSearch('');
      setSearchResults([]);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add member');
    } finally {
      setAdding(null);
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm('Remove this member from the subgroup?')) return;
    setRemoving(memberId);
    try {
      const res = await fetch(`/api/admin/members/${memberId}/subgroup?subgroup=${subgroupId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed');
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to remove');
    } finally {
      setRemoving(null);
    }
  }

  return (
    <>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button type="button" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          Add member
        </button>
      </div>

      {members.length === 0 ? (
        <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>No members assigned yet. Add members to give the subgroup leader visibility.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Program</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Link href={`/admin/members/${m.id}`} style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                      {m.fullName}
                    </Link>
                  </td>
                  <td>{m.enrolledProgram ?? '—'}</td>
                  <td>{m.progressPct}%</td>
                  <td>{m.stage}</td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {new Date(m.assignedAt).toLocaleDateString()}
                    {m.assignedBy && <span style={{ color: 'var(--color-gray-500)' }}> by {m.assignedBy}</span>}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                      onClick={() => removeMember(m.id)}
                      disabled={!!removing}
                    >
                      {removing === m.id ? '…' : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              maxWidth: 480,
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1rem' }}>Add member to subgroup</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), doSearch())}
                placeholder="Search by name or email"
                style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #ccc', borderRadius: '6px' }}
              />
              <button type="button" className="btn btn-primary" onClick={() => doSearch()} disabled={searching}>
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>
            {searchResults.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {searchResults.map((m) => (
                  <li
                    key={m.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 0',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{m.fullName}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>{m.email}</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                      onClick={() => addMember(m.id)}
                      disabled={adding !== null}
                    >
                      {adding === m.id ? 'Adding…' : 'Add'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : search ? (
              <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>
                {searching ? 'Searching…' : 'No members found or all matching members are already in this subgroup.'}
              </p>
            ) : null}
            <div style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
