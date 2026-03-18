'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PROGRAMS } from '@/lib/content/programs';

type MemberDetailActionsProps = {
  userId: string;
  currentProgramSlug: string | null;
  assessmentCompleted: boolean;
};

export default function MemberDetailActions({ userId, currentProgramSlug, assessmentCompleted }: MemberDetailActionsProps) {
  const router = useRouter();
  const [programSlug, setProgramSlug] = useState(currentProgramSlug ?? '');
  const [loading, setLoading] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleChangeProgram = async () => {
    if (!programSlug) return;
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
      <div>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Change program (admin only)</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={programSlug}
            onChange={(e) => setProgramSlug(e.target.value)}
            style={{ flex: 1, maxWidth: '300px', padding: '0.5rem' }}
          >
            <option value="">— Select —</option>
            {PROGRAMS.map((p) => (
              <option key={p.slug} value={p.slug}>{p.title}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleChangeProgram}
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
        >
          Soft Delete Account
        </button>
        {confirmDelete && (
          <div style={{ marginTop: '0.5rem' }}>
            <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Confirm soft delete?</p>
            <button type="button" className="btn btn-outline" onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button type="button" className="btn" style={{ background: '#c00', color: 'white', marginLeft: '0.5rem' }} onClick={handleDelete} disabled={loading === 'delete'}>
              {loading === 'delete' ? '...' : 'Yes, Delete'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
