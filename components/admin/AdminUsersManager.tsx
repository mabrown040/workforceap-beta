'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import DataTable from '@/components/portal/ui/DataTable';
import { useFocusTrap } from '@/hooks/useFocusTrap';

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
  memberHref: string | null;
};

type Props = {
  initialUsers: UserRow[];
  canManageRoles: boolean;
};

const ROLE_OPTIONS = ['member', 'admin', 'super_admin', 'case_manager'] as const;

export default function AdminUsersManager({ initialUsers, canManageRoles }: Props) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const closeConfirmDelete = () => setConfirmDeleteId(null);
  // The confirm control is rendered twice (desktop table row + mobile card for the same
  // user), toggled purely via CSS breakpoints, but only one is ever visible at a time.
  // A single trap is attached to whichever instance is actually visible so Tab/Escape
  // handling isn't fought over by a hidden duplicate.
  const confirmDeleteTrapRef = useFocusTrap(!!confirmDeleteId, closeConfirmDelete);
  const confirmDeleteTableNodeRef = useRef<HTMLSpanElement | null>(null);
  const confirmDeleteCardNodeRef = useRef<HTMLSpanElement | null>(null);
  const attachVisibleTrap = useCallback(() => {
    const node = confirmDeleteTableNodeRef.current?.offsetParent
      ? confirmDeleteTableNodeRef.current
      : confirmDeleteCardNodeRef.current;
    confirmDeleteTrapRef.current = node ?? null;
  }, [confirmDeleteTrapRef]);
  const setConfirmDeleteTableNode = useCallback(
    (node: HTMLSpanElement | null) => {
      confirmDeleteTableNodeRef.current = node;
      attachVisibleTrap();
    },
    [attachVisibleTrap]
  );
  const setConfirmDeleteCardNode = useCallback(
    (node: HTMLSpanElement | null) => {
      confirmDeleteCardNodeRef.current = node;
      attachVisibleTrap();
    },
    [attachVisibleTrap]
  );
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err' | 'warn'; text: string } | null>(null);
  const [draft, setDraft] = useState<{ fullName: string; email: string; role: string }>({ fullName: '', email: '', role: 'member' });
  const [createDraft, setCreateDraft] = useState<{ fullName: string; email: string; role: string; sendResetEmail: boolean }>({
    fullName: '',
    email: '',
    role: canManageRoles ? 'admin' : 'member',
    sendResetEmail: true,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      [user.fullName, user.email, user.role].some((value) => value.toLowerCase().includes(q))
    );
  }, [query, users]);

  function startEdit(user: UserRow) {
    setEditingId(user.id);
    setDraft({ fullName: user.fullName, email: user.email, role: user.role });
    setMessage(null);
  }

  async function saveUser(userId: string) {
    setSavingId(userId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'err', text: data.error ?? 'Could not save user.' });
        return;
      }
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, ...data.user } : user)));
      setEditingId(null);
      setMessage({ type: 'ok', text: 'User updated.' });
    } catch {
      setMessage({ type: 'err', text: 'Network error while saving user.' });
    } finally {
      setSavingId(null);
    }
  }

  async function sendReset(userId: string) {
    setResettingId(userId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'err', text: data.error ?? 'Could not send reset email.' });
        return;
      }
      setMessage({ type: 'ok', text: data.message ?? 'Password reset sent.' });
    } catch {
      setMessage({ type: 'err', text: 'Network error while sending reset.' });
    } finally {
      setResettingId(null);
    }
  }

  async function deleteUser(userId: string) {
    setDeletingId(userId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'err', text: data.error ?? 'Could not delete user.' });
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setConfirmDeleteId(null);
      setMessage({ type: 'ok', text: 'User deleted.' });
    } catch {
      setMessage({ type: 'err', text: 'Network error while deleting user.' });
    } finally {
      setDeletingId(null);
    }
  }

  async function createUser() {
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(createDraft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'err', text: data.error ?? 'Could not create user.' });
        return;
      }

      if (data.user) {
        setUsers((prev) => [{
          ...data.user,
          createdAt: new Date().toISOString(),
          memberHref: data.user.role === 'member' ? `/admin/members/${data.user.id}` : null,
        }, ...prev]);
      }

      setCreateDraft({
        fullName: '',
        email: '',
        role: canManageRoles ? 'admin' : 'member',
        sendResetEmail: true,
      });

      setMessage({
        type: data.warning ? 'warn' : 'ok',
        text: data.warning ?? 'User created.',
      });
    } catch {
      setMessage({ type: 'err', text: 'Network error while creating user.' });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <section className="portal-card portal-card--flat" style={{ padding: '1rem', display: 'grid', gap: '0.85rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Quick create</h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--color-on-surface-variant)' }}>
            Fast access setup for admins, staff, or a basic member login. Use Add member for full enrollment intake.
          </p>
        </div>

        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <input
            type="text"
            value={createDraft.fullName}
            onChange={(e) => setCreateDraft((prev) => ({ ...prev, fullName: e.target.value }))}
            placeholder="Full name"
            style={{ padding: '0.65rem 0.8rem', borderRadius: '0.65rem', border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--color-on-surface)' }}
          />
          <input
            type="email"
            value={createDraft.email}
            onChange={(e) => setCreateDraft((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="name@workforceap.org"
            style={{ padding: '0.65rem 0.8rem', borderRadius: '0.65rem', border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--color-on-surface)' }}
          />
          <select
            value={createDraft.role}
            onChange={(e) => setCreateDraft((prev) => ({ ...prev, role: e.target.value }))}
            style={{ padding: '0.65rem 0.8rem', borderRadius: '0.65rem', border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--color-on-surface)' }}
          >
            <option value="member">member</option>
            {canManageRoles ? <option value="admin">admin</option> : null}
            {canManageRoles ? <option value="case_manager">case_manager</option> : null}
            {canManageRoles ? <option value="super_admin">super_admin</option> : null}
          </select>
        </div>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={createDraft.sendResetEmail}
            onChange={(e) => setCreateDraft((prev) => ({ ...prev, sendResetEmail: e.target.checked }))}
          />
          Send password setup email right away
        </label>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" disabled={creating} onClick={() => void createUser()}>
            {creating ? 'Creating…' : 'Create user'}
          </button>
          <a href="/admin/members/new" className="btn btn-outline">Full member intake</a>
          <a href="/admin/invites/new" className="btn btn-outline">Invite instead</a>
        </div>
      </section>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, or role"
          style={{ padding: '0.6rem 0.8rem', minWidth: '260px', borderRadius: '0.65rem', border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--color-on-surface)' }}
        />
        <a href="/admin/invites/new" className="btn btn-outline">Invite user</a>
        <a href="/admin/members/new" className="btn btn-primary">Add member</a>
      </div>

      {message && (
        <div style={{ padding: '0.75rem 0.9rem', borderRadius: '0.75rem', background: message.type === 'ok' ? 'rgba(74,155,79,0.12)' : message.type === 'warn' ? 'rgba(217,119,6,0.12)' : 'rgba(173,44,77,0.12)', color: message.type === 'ok' ? 'var(--color-green, #4a9b4f)' : message.type === 'warn' ? '#b45309' : 'var(--color-accent)', fontWeight: 600 }}>
          {message.text}
        </div>
      )}

      <div className="admin-table-scroll">
        <DataTable
          variant="admin"
          tableClassName="admin-table"
          scrollX={false}
          rows={filtered}
          rowKey={(user) => user.id}
          columns={[
            {
              key: 'name',
              header: 'Name',
              cell: (user) =>
                editingId === user.id ? (
                  <input
                    value={draft.fullName}
                    onChange={(e) => setDraft((prev) => ({ ...prev, fullName: e.target.value }))}
                    style={{ width: '100%', padding: '0.45rem 0.6rem' }}
                  />
                ) : user.memberHref ? (
                  <a href={user.memberHref}>{user.fullName}</a>
                ) : (
                  user.fullName
                ),
            },
            {
              key: 'email',
              header: 'Email',
              cell: (user) =>
                editingId === user.id ? (
                  <input
                    value={draft.email}
                    onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
                    style={{ width: '100%', padding: '0.45rem 0.6rem' }}
                  />
                ) : (
                  user.email
                ),
            },
            {
              key: 'role',
              header: 'Role',
              cell: (user) =>
                editingId === user.id && canManageRoles ? (
                  <select
                    value={draft.role}
                    onChange={(e) => setDraft((prev) => ({ ...prev, role: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.6rem',
                      borderRadius: '0.4rem',
                      border: '1px solid var(--outline-variant)',
                      background: 'var(--surface-container-lowest)',
                      color: 'var(--color-on-surface)',
                    }}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                ) : (
                  user.role
                ),
            },
            {
              key: 'created',
              header: 'Created',
              cell: (user) => new Date(user.createdAt).toLocaleDateString(),
            },
            {
              key: 'actions',
              header: 'Actions',
              cell: (user) => {
                const isEditing = editingId === user.id;
                return (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={savingId === user.id}
                          onClick={() => void saveUser(user.id)}
                        >
                          {savingId === user.id ? 'Saving…' : 'Save'}
                        </button>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => startEdit(user)}>
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={resettingId === user.id}
                      onClick={() => void sendReset(user.id)}
                    >
                      {resettingId === user.id ? 'Sending…' : 'Reset password'}
                    </button>
                    {canManageRoles &&
                      (confirmDeleteId === user.id ? (
                        <span
                          ref={setConfirmDeleteTableNode}
                          role="dialog"
                          aria-modal="true"
                          aria-label={`Confirm delete user ${user.fullName}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Confirm?</span>
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ background: 'var(--color-accent)', color: '#fff' }}
                            disabled={deletingId === user.id}
                            onClick={() => void deleteUser(user.id)}
                          >
                            {deletingId === user.id ? '…' : 'Yes, delete'}
                          </button>
                          <button type="button" className="btn btn-outline btn-sm" onClick={closeConfirmDelete}>
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}
                          onClick={() => setConfirmDeleteId(user.id)}
                        >
                          Delete
                        </button>
                      ))}
                  </div>
                );
              },
            },
          ]}
        />
      </div>

      <ul className="admin-portal-card-list" aria-label="Users mobile list">
        {filtered.map((user) => {
          const isEditing = editingId === user.id;
          return (
            <li key={user.id} className="admin-portal-card">
              <div className="admin-portal-card__header">
                <strong>{user.fullName}</strong>
                <span className="admin-portal-card__badge">{user.role}</span>
              </div>
              <p className="admin-portal-card__meta">{user.email}</p>
              <p className="admin-portal-card__meta">Created {new Date(user.createdAt).toLocaleDateString()}</p>
              {isEditing ? (
                <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <input value={draft.fullName} onChange={(e) => setDraft((prev) => ({ ...prev, fullName: e.target.value }))} style={{ width: '100%', padding: '0.55rem 0.65rem' }} />
                  <input value={draft.email} onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))} style={{ width: '100%', padding: '0.55rem 0.65rem' }} />
                  {canManageRoles ? (
                    <select
                      value={draft.role}
                      onChange={(e) => setDraft((prev) => ({ ...prev, role: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.65rem',
                        borderRadius: '0.4rem',
                        border: '1px solid var(--outline-variant)',
                        background: 'var(--surface-container-lowest)',
                        color: 'var(--color-on-surface)',
                      }}
                    >
                      {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  ) : null}
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                {isEditing ? (
                  <>
                    <button type="button" className="btn btn-primary btn-sm" disabled={savingId === user.id} onClick={() => void saveUser(user.id)}>
                      {savingId === user.id ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                  </>
                ) : (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => startEdit(user)}>Edit</button>
                )}
                <button type="button" className="btn btn-outline btn-sm" disabled={resettingId === user.id} onClick={() => void sendReset(user.id)}>
                  {resettingId === user.id ? 'Sending…' : 'Reset password'}
                </button>
                {user.memberHref ? <a href={user.memberHref} className="btn btn-ghost btn-sm">Open record</a> : null}
                {canManageRoles && (
                  confirmDeleteId === user.id ? (
                    <span
                      ref={setConfirmDeleteCardNode}
                      role="dialog"
                      aria-modal="true"
                      aria-label={`Confirm delete user ${user.fullName}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <button type="button" className="btn btn-sm" style={{ background: 'var(--color-accent)', color: '#fff' }} disabled={deletingId === user.id} onClick={() => void deleteUser(user.id)}>
                        {deletingId === user.id ? '…' : 'Confirm delete'}
                      </button>
                      <button type="button" className="btn btn-outline btn-sm" onClick={closeConfirmDelete}>Cancel</button>
                    </span>
                  ) : (
                    <button type="button" className="btn btn-outline btn-sm" style={{ color: 'var(--color-accent)', borderColor: 'var(--color-accent)' }} onClick={() => setConfirmDeleteId(user.id)}>
                      Delete
                    </button>
                  )
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
