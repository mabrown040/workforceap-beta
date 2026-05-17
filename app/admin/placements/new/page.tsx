'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';

export default function RecordPlacementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMemberId = searchParams?.get('memberId') ?? '';

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
    if (!memberId.trim()) {
      setError('Member ID is required');
      return;
    }
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
    display: 'block',
    width: '100%',
    padding: '0.75rem 0.875rem',
    border: '1px solid var(--outline-variant)',
    borderRadius: '0.75rem',
    fontSize: '0.95rem',
    marginTop: '0.35rem',
    boxSizing: 'border-box',
    background: 'var(--surface-container-low)',
    color: 'var(--color-on-surface)',
  };

  return (
    <PortalPageFrame>
      <PageHeader
        title="Record Placement"
        subtitle="Add a confirmed placement outcome for a member and send them to the placed stage."
      />

      <div className="portal-card portal-card--flat" style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="portal-card__body">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label>
              <span style={{ fontWeight: 600 }}>Member ID *</span>
              <input
                style={field}
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="User UUID"
                required
              />
            </label>
            <label>
              <span style={{ fontWeight: 600 }}>Employer Name *</span>
              <input
                style={field}
                value={employerName}
                onChange={(e) => setEmployerName(e.target.value)}
                placeholder="Acme Corp"
                required
              />
            </label>
            <label>
              <span style={{ fontWeight: 600 }}>Job Title *</span>
              <input
                style={field}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Software Engineer"
                required
              />
            </label>
            <label>
              <span style={{ fontWeight: 600 }}>Starting Salary (annual $, optional)</span>
              <input
                style={field}
                type="number"
                min={0}
                value={startingSalary}
                onChange={(e) => setStartingSalary(e.target.value)}
                placeholder="55000"
              />
            </label>
            <label>
              <span style={{ fontWeight: 600 }}>Start Date (optional)</span>
              <input style={field} type="date" value={placedAt} onChange={(e) => setPlacedAt(e.target.value)} />
            </label>
            <label>
              <span style={{ fontWeight: 600 }}>Notes (optional)</span>
              <textarea
                style={{ ...field, minHeight: 96, resize: 'vertical' }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            {error && <p style={{ color: 'var(--color-error)', margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Saving…' : 'Save Placement'}
              </button>
              <button type="button" onClick={() => router.push('/admin/pipeline')} className="btn btn-outline">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </PortalPageFrame>
  );
}
