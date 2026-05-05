'use client';

import { useState } from 'react';
import { logExternalCertification } from './logCertAction';

export default function LogCertificationModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await logExternalCertification(formData);
      setOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to log certification');
    }
    setLoading(false);
  };

  if (!open) {
    return (
      <button type="button" className="btn btn-outline" style={{ marginTop: '1rem', width: '100%' }} onClick={() => setOpen(true)}>
        Add a Certificate
      </button>
    );
  }

  return (
    <div style={{ marginTop: '1rem', background: 'var(--surface-container)', padding: '1rem', borderRadius: '0.5rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Add a Certificate</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input
          name="certName"
          placeholder="Certification Name (e.g., AWS Cloud Practitioner)"
          required
          style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--outline-variant)' }}
        />
        <input
          type="date"
          name="earnedAt"
          required
          style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--outline-variant)' }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Certificate'}
          </button>
        </div>
      </form>
    </div>
  );
}
