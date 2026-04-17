'use client';

import { useState } from 'react';
import { logExternalCertification } from './logCertAction';

export default function LogCertificationModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const formData = new FormData(e.currentTarget);
      await logExternalCertification(formData);
      setOpen(false);
    } catch (err) {
      console.error(err);
      setError('We couldn\'t log your certification. Try again in a moment.');
    }
    setLoading(false);
  };

  if (!open) {
    return (
      <button className="btn btn-outline" style={{ marginTop: '1rem', width: '100%' }} onClick={() => setOpen(true)}>
        Log External Certification
      </button>
    );
  }

  return (
    <div style={{ marginTop: '1rem', background: 'var(--surface-container)', padding: '1rem', borderRadius: '0.5rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Log External Certification</h3>
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
        {error ? (
          <p role="alert" style={{ fontSize: '0.85rem', color: 'var(--color-accent)', margin: 0 }}>{error}</p>
        ) : null}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Logging...' : 'Log Cert'}
          </button>
        </div>
      </form>
    </div>
  );
}
