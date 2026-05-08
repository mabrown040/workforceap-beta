'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/portal/PageHeader';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import DataTable from '@/components/portal/ui/DataTable';
import SectionHeader from '@/components/portal/ui/SectionHeader';
import { FormField, TextArea, TextInput } from '@/components/portal/ui/FormField';

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

function PortalListSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        textAlign: 'center',
        padding: '2.5rem 1rem',
        color: 'var(--color-on-surface-variant)',
        fontSize: '0.9rem',
      }}
    >
      {label}
    </div>
  );
}

export default function PlacementsPage() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to record placement');
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

  const msgIsSuccess = message?.includes('success');

  return (
    <div style={{ width: '100%', maxWidth: 'var(--max-width, 80rem)', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 1.5rem) 2rem' }}>
      <PageHeader
        title="Placement tracking"
        subtitle="Record and track member job placements."
        breadcrumbs={[{ label: 'Counselor Portal', href: '/counselor' }, { label: 'Placements' }]}
        action={
          <button type="button" className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : 'Record placement'}
          </button>
        }
      />

      {message ? (
        <div
          role={msgIsSuccess ? 'status' : 'alert'}
          style={{
            padding: '0.875rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: msgIsSuccess
              ? 'color-mix(in srgb, var(--color-green) 10%, transparent)'
              : 'color-mix(in srgb, var(--color-error) 10%, transparent)',
            border: `1px solid color-mix(in srgb, ${msgIsSuccess ? 'var(--color-green)' : 'var(--color-error)'} 20%, transparent)`,
            color: msgIsSuccess ? 'var(--color-green)' : 'var(--color-error)',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      ) : null}

      {showAddForm ? (
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--surface-container)',
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--outline-variant)',
            marginBottom: '1.5rem',
          }}
        >
          <SectionHeader title="New placement" density="compact" />
          <div style={{ display: 'grid', gap: '0 1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <FormField label="Member ID" required>
              <TextInput type="text" value={memberId} onChange={(e) => setMemberId(e.target.value)} required aria-required />
            </FormField>
            <FormField label="Employer" required>
              <TextInput type="text" value={employerName} onChange={(e) => setEmployerName(e.target.value)} required aria-required />
            </FormField>
            <FormField label="Job title" required>
              <TextInput type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required aria-required />
            </FormField>
            <FormField label="Start date">
              <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FormField>
            <FormField label="Salary (annual)">
              <TextInput type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="50000" inputMode="numeric" />
            </FormField>
            <FormField label="Program">
              <TextInput type="text" value={programSlug} onChange={(e) => setProgramSlug(e.target.value)} placeholder="program-slug" />
            </FormField>
          </div>
          <FormField label="Notes">
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </FormField>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Recording…' : 'Record placement'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setShowAddForm(false);
                resetForm();
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {loading ? <PortalListSkeleton label="Loading placements…" /> : null}

      {!loading && placements.length === 0 ? (
        <PortalEmptyState
          title="No placements yet"
          description="When you record a placement, it will appear in this list for your team."
          icon={<span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-on-surface-variant)' }} aria-hidden>work</span>}
          primaryAction={{ label: 'Record placement', onClick: () => setShowAddForm(true) }}
        />
      ) : null}

      {!loading && placements.length > 0 ? (
        <div
          style={{
            background: 'var(--surface-container)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--outline-variant)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--outline-variant)' }}>
            <SectionHeader
              density="compact"
              title="Recorded placements"
              subtitle={`${placements.length} total`}
            />
          </div>
          <DataTable
            density="compact"
            variant="portal"
            scrollX
            rows={placements}
            rowKey={(p) => p.id}
            columns={[
              {
                key: 'member',
                header: 'Member',
                cell: (p) => (
                  <>
                    <div style={{ fontWeight: 600 }}>{p.member_email}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{p.program_slug || 'No program'}</div>
                  </>
                ),
              },
              { key: 'employer', header: 'Employer', cell: (p) => <span style={{ fontWeight: 500 }}>{p.employer_name}</span> },
              { key: 'job', header: 'Job title', cell: (p) => p.job_title },
              {
                key: 'start',
                header: 'Start date',
                cell: (p) => <span style={{ color: 'var(--color-on-surface-variant)' }}>{formatDate(p.start_date)}</span>,
              },
              {
                key: 'salary',
                header: 'Salary',
                cell: (p) => (
                  <span style={{ fontWeight: 600, color: 'var(--color-green)' }}>{formatCurrency(p.salary_offered)}</span>
                ),
              },
              {
                key: 'placed',
                header: 'Placed',
                cell: (p) => <span style={{ color: 'var(--color-on-surface-variant)' }}>{formatDate(p.placed_at)}</span>,
              },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
