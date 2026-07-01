'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PROGRAMS } from '@/lib/content/programs';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export type ProgramOption = { slug: string; name: string; status?: string };

type MemberDetailActionsProps = {
  userId: string;
  memberName: string;
  enrollmentGateBlocked: boolean;
  currentProgramSlug: string | null;
  assessmentCompleted: boolean;
  programOptions: ProgramOption[];
};

export default function MemberDetailActions({
  userId,
  memberName,
  enrollmentGateBlocked,
  currentProgramSlug,
  assessmentCompleted,
  programOptions,
}: MemberDetailActionsProps) {
  const router = useRouter();
  const [programSlug, setProgramSlug] = useState(currentProgramSlug ?? '');
  const [loading, setLoading] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const closeConfirmDelete = () => setConfirmDelete(false);
  const confirmDeleteTrapRef = useFocusTrap(confirmDelete, closeConfirmDelete);

  const options =
    programOptions.length > 0
      ? programOptions
      : PROGRAMS.map((p) => ({ slug: p.slug, name: p.title }));

  const handleChangeProgram = async () => {
    if (!programSlug) return;
    const selected = options.find((o) => o.slug === programSlug);
    const label = selected?.name ?? programSlug;
    if (enrollmentGateBlocked) {
      const ok = window.confirm(
        `Enroll ${memberName} in ${label}?\n\nThis member is not yet verified for self-serve training enrollment. Admin enrollment will still work and create an admin bypass.`
      );
      if (!ok) return;
    }
    setLoading('program');
    try {
      const res = await fetch(`/api/admin/members/${userId}/program`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programSlug }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading('');
    }
  };

  const handleResetAssessment = async () => {
    setLoading('assessment');
    try {
      const res = await fetch(`/api/admin/members/${userId}/reset-assessment`, { method: 'POST' });
      if (res.ok) router.refresh();
    } finally {
      setLoading('');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setLoading('delete');
    try {
      const res = await fetch(`/api/admin/members/${userId}/delete`, { method: 'POST' });
      if (res.ok) window.location.href = '/admin/members';
    } finally {
      setLoading('');
    }
  };

  return (
    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {enrollmentGateBlocked && (
        <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface)', margin: 0 }}>
          WIOA status is still blocking self-serve training enrollment — admin program changes still apply and set an admin enrollment bypass.
        </p>
      )}
      <div>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Change program (admin only)</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={programSlug}
            onChange={(e) => setProgramSlug(e.target.value)}
            style={{ flex: 1, maxWidth: '300px', padding: '0.5rem' }}
          >
            <option value="">— Select —</option>
            {options.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
                {'status' in p && p.status && p.status !== 'active' ? ` (${p.status})` : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => void handleChangeProgram()}
            disabled={!programSlug || loading === 'program'}
          >
            {loading === 'program' ? '...' : 'Save'}
          </button>
        </div>
      </div>

      {assessmentCompleted && (
        <button
          type="button"
          className="btn btn-outline"
          onClick={handleResetAssessment}
          disabled={!!loading}
        >
          {loading === 'assessment' ? '...' : 'Reset Assessment'}
        </button>
      )}

      <div>
        <button
          type="button"
          className="btn"
          style={{ background: 'var(--color-error, #c00)', color: 'white' }}
          onClick={() => setConfirmDelete(true)}
          disabled={!!loading}
          aria-haspopup="dialog"
          aria-expanded={confirmDelete}
          aria-controls="member-soft-delete-dialog"
        >
          Soft Delete Account
        </button>
        {confirmDelete && (
          <div
            className="partner-modal-overlay"
            onClick={closeConfirmDelete}
            role="presentation"
            tabIndex={-1}
          >
            <div
              id="member-soft-delete-dialog"
              ref={confirmDeleteTrapRef as React.RefObject<HTMLDivElement>}
              className="partner-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="member-soft-delete-title"
            >
              <h2 id="member-soft-delete-title" style={{ margin: '0 0 0.5rem', fontSize: '1.15rem' }}>
                Confirm soft delete?
              </h2>
              <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
                This soft-deletes {memberName}&rsquo;s account. This can be reversed by support if needed.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={closeConfirmDelete}>Cancel</button>
                <button type="button" className="btn" style={{ background: '#c00', color: 'white' }} onClick={handleDelete} disabled={loading === 'delete'}>
                  {loading === 'delete' ? '...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
