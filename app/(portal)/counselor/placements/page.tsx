'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('counselor');
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsSuccess, setMessageIsSuccess] = useState(false);

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
      setMessageIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setMessageIsSuccess(false);

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
        throw new Error(err.error || t('failed'));
      }

      setMessage(t('placementRecordedSuccess'));
      setMessageIsSuccess(true);
      setShowAddForm(false);
      resetForm();
      loadPlacements();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : t('failedToRecordPlacement'));
      setMessageIsSuccess(false);
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
    <div style={{ width: '100%', maxWidth: 'var(--max-width, 80rem)', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 1.5rem) 2rem' }}>
      <PageHeader
        title={t('placementTrackingTitle')}
        subtitle={t('placementTrackingSubtitle')}
        breadcrumbs={[{ label: t('counselorPortal'), href: '/counselor' }, { label: t('placements') }]}
        action={
          <button type="button" className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? t('cancel') : t('recordPlacement')}
          </button>
        }
      />

      {message ? (
        <div
          role={messageIsSuccess ? 'status' : 'alert'}
          style={{
            padding: '0.875rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: messageIsSuccess
              ? 'color-mix(in srgb, var(--color-green) 10%, transparent)'
              : 'color-mix(in srgb, var(--color-error, #dc2626) 10%, transparent)',
            border: `1px solid color-mix(in srgb, ${messageIsSuccess ? 'var(--color-green)' : 'var(--color-error, #dc2626)'} 20%, transparent)`,
            color: messageIsSuccess ? 'var(--color-green)' : 'var(--color-error, #dc2626)',
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
          <SectionHeader title={t('newPlacement')} density="compact" />
          <div style={{ display: 'grid', gap: '0 1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <FormField label={t('memberId')} required>
              <TextInput type="text" value={memberId} onChange={(e) => setMemberId(e.target.value)} required aria-required />
            </FormField>
            <FormField label={t('employer')} required>
              <TextInput type="text" value={employerName} onChange={(e) => setEmployerName(e.target.value)} required aria-required />
            </FormField>
            <FormField label={t('jobTitle')} required>
              <TextInput type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required aria-required />
            </FormField>
            <FormField label={t('startDate')}>
              <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FormField>
            <FormField label={t('salaryAnnual')}>
              <TextInput type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="50000" inputMode="numeric" />
            </FormField>
            <FormField label={t('program')}>
              <TextInput type="text" value={programSlug} onChange={(e) => setProgramSlug(e.target.value)} placeholder="program-slug" />
            </FormField>
          </div>
          <FormField label={t('notes')}>
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </FormField>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ opacity: submitting ? 0.7 : 1 }}>
              {submitting ? t('recording') : t('recordPlacement')}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setShowAddForm(false);
                resetForm();
              }}
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? <PortalListSkeleton label={t('loadingPlacements')} /> : null}

      {!loading && placements.length === 0 ? (
        <PortalEmptyState
          title={t('noPlacementsYet')}
          description={t('noPlacementsDesc')}
          icon={<span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-on-surface-variant)' }} aria-hidden>work</span>}
          primaryAction={{ label: t('recordPlacement'), onClick: () => setShowAddForm(true) }}
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
              title={t('recordedPlacements')}
              subtitle={`${placements.length} ${t('total')}`}
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
                header: t('member'),
                cell: (p) => (
                  <>
                    <div style={{ fontWeight: 600 }}>{p.member_email}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{p.program_slug || t('noProgram')}</div>
                  </>
                ),
              },
              { key: 'employer', header: t('employer'), cell: (p) => <span style={{ fontWeight: 500 }}>{p.employer_name}</span> },
              { key: 'job', header: t('jobTitle'), cell: (p) => p.job_title },
              {
                key: 'start',
                header: t('startDate'),
                cell: (p) => <span style={{ color: 'var(--color-on-surface-variant)' }}>{formatDate(p.start_date)}</span>,
              },
              {
                key: 'salary',
                header: t('salary'),
                align: 'right',
                cell: (p) => (
                  <span style={{ fontWeight: 600, color: 'var(--color-green)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(p.salary_offered)}</span>
                ),
              },
              {
                key: 'placed',
                header: t('placed'),
                cell: (p) => <span style={{ color: 'var(--color-on-surface-variant)' }}>{formatDate(p.placed_at)}</span>,
              },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
