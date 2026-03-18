'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteAccountButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleDelete = async () => {
    if (confirmText.toLowerCase() !== 'delete') return;
    setLoading(true);
    try {
      const res = await fetch('/api/member/delete-account', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error ?? 'Failed to delete account');
      }
    } catch {
      alert('Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn"
        style={{ background: 'var(--color-error, #c00)', color: 'white' }}
        onClick={() => setShowModal(true)}
      >
        Delete Account
      </button>
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !loading && setShowModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: 'var(--radius-md)',
              maxWidth: '400px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '0.75rem' }}>Delete Account</h3>
            <p style={{ marginBottom: '1rem', fontSize: '0.95rem', color: 'var(--color-gray-600)' }}>
              This will deactivate your account. Type &quot;delete&quot; to confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type delete to confirm"
              style={{ width: '100%', marginBottom: '1rem', padding: '0.5rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} disabled={loading}>
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--color-error)', color: 'white' }}
                onClick={handleDelete}
                disabled={confirmText.toLowerCase() !== 'delete' || loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
