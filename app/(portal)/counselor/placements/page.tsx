'use client';

import { useState, useEffect } from 'react';

interface Placement {
  id: string;
  user_id: string;
  member_email: string;
  employer_name: string;
  job_title: string;
  start_date: string | null;
  salary_offered: number | null;
  placed_at: string;
  notes: string | null;
  program_slug: string | null;
}

export default function PlacementsPage() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Form state
  const [memberId, setMemberId] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [salary, setSalary] = useState('');
  const [programSlug, setProgramSlug] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadPlacements();
  }, []);

  const loadPlacements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/counselor/placements');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setPlacements(data.placements || []);
    } catch {
      setMessage('Could not load placements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/counselor/placements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: memberId,
          employerName,
          jobTitle,
          startDate: startDate || null,
          salaryOffered: salary ? parseInt(salary, 10) : null,
          programSlug: programSlug || null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }

      setMessage('Placement recorded successfully!');
      setShowAddForm(false);
      resetForm();
      loadPlacements();
    } catch (e: any) {
      setMessage(e.message || 'Failed to record placement');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setMemberId('');
    setEmployerName('');
    setJobTitle('');
    setStartDate('');
    setSalary('');
    setProgramSlug('');
    setNotes('');
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (n: number | null) => {
    if (!n) return '—';
    return `$${n.toLocaleString()}/yr`;
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem' }}>Placement Tracking</h1>
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0, fontSize: '0.9rem' }}>
            Record and track member job placements.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          {showAddForm ? 'Cancel' : '+ Record Placement'}
        </button>
      </div>

      {message && (
        <div style={{
          padding: '0.875rem 1rem',
          borderRadius: 'var(--radius-md)',
          background: message.includes('success') 
            ? 'color-mix(in srgb, var(--color-green) 10%, transparent)'
            : 'color-mix(in srgb, var(--color-error) 10%, transparent)',
          border: `1px solid color-mix(in srgb, ${message.includes('success') ? 'var(--color-green)' : 'var(--color-error)'} 20%, transparent)`,
          color: message.includes('success') ? 'var(--color-green)' : 'var(--color-error)',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}>
          {message}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleSubmit} style={{ 
          background: 'var(--surface-container)', 
          padding: '1.5rem', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px solid var(--outline-variant)',
          marginBottom: '1.5rem' 
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 1rem' }}>New Placement</h3>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Member ID</label>
              <input type="text" value={memberId} onChange={(e) => setMemberId(e.target.value)} required style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', background: 'var(--surface-container-low)', color: 'var(--color-on-surface)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employer</label>
              <input type="text" value={employerName} onChange={(e) => setEmployerName(e.target.value)} required style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', background: 'var(--surface-container-low)', color: 'var(--color-on-surface)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job Title</label>
              <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', background: 'var(--surface-container-low)', color: 'var(--color-on-surface)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', background: 'var(--surface-container-low)', color: 'var(--color-on-surface)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Salary (annual)</label>
              <input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="50000" style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', background: 'var(--surface-container-low)', color: 'var(--color-on-surface)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Program</label>
              <input type="text" value={programSlug} onChange={(e) => setProgramSlug(e.target.value)} placeholder="program-slug" style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', background: 'var(--surface-container-low)', color: 'var(--color-on-surface)' }} />
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', background: 'var(--surface-container-low)', color: 'var(--color-on-surface)', resize: 'vertical' }} />
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
            <button type="submit" disabled={submitting} style={{ padding: '0.75rem 1.25rem', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Recording…' : 'Record Placement'}
            </button>
            <button type="button" onClick={() => { setShowAddForm(false); resetForm(); }} style={{ padding: '0.75rem 1.25rem', background: 'var(--surface-container-high)', color: 'var(--color-on-surface)', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-on-surface-variant)' }}>
          Loading placements…
        </div>
      )}

      {!loading && placements.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-on-surface-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: '0.5rem', display: 'block' }}>work</span>
          <p style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.5rem' }}>No placements yet</p>
          <p style={{ fontSize: '0.85rem', margin: 0 }}>Record a placement to see it here.</p>
        </div>
      )}

      {!loading && placements.length > 0 && (
        <div style={{ background: 'var(--surface-container)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{placements.length} placements</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-container-high)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Member</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employer</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job Title</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Date</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Salary</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placed</th>
                </tr>
              </thead>
              <tbody>
                {placements.map((p) => (
                  <tr key={p.id} style={{ borderTop: '1px solid var(--outline-variant)' }}>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ fontWeight: 600 }}>{p.member_email}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{p.program_slug || 'No program'}</div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 500 }}>{p.employer_name}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>{p.job_title}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-on-surface-variant)' }}>{formatDate(p.start_date)}</td>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--color-green)' }}>{formatCurrency(p.salary_offered)}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-on-surface-variant)' }}>{formatDate(p.placed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
