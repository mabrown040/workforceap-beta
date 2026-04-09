'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function RecordPlacementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMemberId = searchParams.get('memberId') ?? '';

  const [memberId, setMemberId] = useState(initialMemberId);
  const [employerName, setEmployerName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [startingSalary, setStartingSalary] = useState('');
  const [placedAt, setPlacedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId.trim()) { setError('Member ID is required'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${memberId.trim()}/placed-outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employerName,
          jobTitle,
          startingSalary: startingSalary ? parseInt(startingSalary, 10) : null,
          placedAt: placedAt ? new Date(placedAt).toISOString() : undefined,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? `Error ${res.status}`);
        return;
      }
      router.push('/admin/pipeline');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  const field: React.CSSProperties = {
    display: 'block', width: '100%', padding: '0.5rem 0.75rem',
    border: '1px solid var(--color-border, #ccc)', borderRadius: '6px',
    fontSize: '0.95rem', marginTop: '0.25rem', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 520, margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem' }}>Record Placement</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>
          Member ID *
          <input style={field} value={memberId} onChange={e => setMemberId(e.target.value)}
            placeholder="User UUID" required />
        </label>
        <label>
          Employer Name *
          <input style={field} value={employerName} onChange={e => setEmployerName(e.target.value)}
            placeholder="Acme Corp" required />
        </label>
        <label>
          Job Title *
          <input style={field} value={jobTitle} onChange={e => setJobTitle(e.target.value)}
            placeholder="Software Engineer" required />
        </label>
        <label>
          Starting Salary (annual $, optional)
          <input style={field} type="number" min={0} value={startingSalary}
            onChange={e => setStartingSalary(e.target.value)} placeholder="55000" />
        </label>
        <label>
          Start Date (optional)
          <input style={field} type="date" value={placedAt}
            onChange={e => setPlacedAt(e.target.value)} />
        </label>
        <label>
          Notes (optional)
          <textarea style={{ ...field, minHeight: 80, resize: 'vertical' }} value={notes}
            onChange={e => setNotes(e.target.value)} />
        </label>
        {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="submit" disabled={loading} style={{
            padding: '0.6rem 1.4rem', background: 'var(--color-blue, #2563eb)',
            color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? 'Saving…' : 'Save Placement'}
          </button>
          <button type="button" onClick={() => router.push('/admin/pipeline')} style={{
            padding: '0.6rem 1.2rem', background: 'transparent',
            border: '1px solid var(--color-border, #ccc)', borderRadius: '6px', cursor: 'pointer',
          }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
